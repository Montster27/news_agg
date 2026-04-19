import "server-only";

import { AI_ARTICLE_MODEL, getOpenAIClient } from "@/lib/ai-client";
import { Article, ArticleDomain } from "@/lib/types";

const ONE_HOUR = 60 * 60 * 1000;
const AI_FAILURE_COOLDOWN = 15 * 60 * 1000;
const MAX_PROCESSED_CACHE_ENTRIES = 300;
const GENERIC_TAGS = new Set(["ai", "technology", "startup", "news", "tech"]);
const VALID_DOMAINS: ArticleDomain[] = [
  "AI",
  "Chips",
  "Infra",
  "Bio",
  "Energy",
  "Macro",
];

type ArticleInput = Pick<Article, "id" | "headline" | "summary" | "source">;

type ProcessedArticle = {
  clean_summary: string;
  domain: Extract<ArticleDomain, "AI" | "Chips" | "Infra" | "Bio" | "Energy" | "Macro">;
  tags: string[];
  importance: 1 | 2 | 3 | 4 | 5;
};

type CacheEntry = {
  expiresAt: number;
  value: ProcessedArticle;
};

const processedCache = new Map<string, CacheEntry>();
let aiDisabledUntil = 0;

const client = getOpenAIClient();

const systemPrompt = `You are a technology analyst.

Your job:
- summarize tech news clearly
- classify into domains
- assign tags that reflect underlying trends

Be precise and consistent.`;

const responseSchema = {
  type: "object",
  properties: {
    articles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          summary: {
            type: "string",
            description: "A clear two-sentence summary.",
          },
          domain: {
            type: "string",
            enum: VALID_DOMAINS,
          },
          tags: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 4,
          },
          importance: {
            type: "integer",
            minimum: 1,
            maximum: 5,
          },
        },
        required: ["id", "summary", "domain", "tags", "importance"],
        additionalProperties: false,
      },
    },
  },
  required: ["articles"],
  additionalProperties: false,
} as const;

function cacheKey(article: ArticleInput) {
  return `${article.source ?? "unknown"}::${article.headline}`.toLowerCase();
}

function pruneProcessedCache() {
  const now = Date.now();

  for (const [key, entry] of processedCache) {
    if (entry.expiresAt <= now) {
      processedCache.delete(key);
    }
  }

  while (processedCache.size > MAX_PROCESSED_CACHE_ENTRIES) {
    const oldestKey = processedCache.keys().next().value;

    if (!oldestKey) {
      break;
    }

    processedCache.delete(oldestKey);
  }
}

function setProcessedCache(key: string, value: ProcessedArticle) {
  processedCache.set(key, { value, expiresAt: Date.now() + ONE_HOUR });
  pruneProcessedCache();
}

function sentenceClamp(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "Summary unavailable for this feed item.";
  }

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) ?? [cleaned];
  return sentences
    .slice(0, 2)
    .map((sentence) => sentence.trim())
    .join(" ");
}

function sanitizeTag(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeTags(tags: string[]) {
  const normalized = Array.from(
    new Set(
      tags
        .map(sanitizeTag)
        .filter((tag) => tag && !GENERIC_TAGS.has(tag)),
    ),
  ).slice(0, 4);

  return normalized.length ? normalized : ["uncategorized"];
}

function fallbackArticle(article: ArticleInput): ProcessedArticle {
  return {
    clean_summary: sentenceClamp(article.summary),
    domain: "Macro",
    tags: ["uncategorized"],
    importance: 3,
  };
}

export async function processArticle(article: ArticleInput): Promise<ProcessedArticle> {
  const key = cacheKey(article);
  const cached = processedCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const dummyArticle = {
    ...article,
    id: article.id ?? cacheKey(article),
    date: new Date().toISOString(),
    processed_at: new Date().toISOString(),
    week: "now",
    domain: "Macro" as ArticleDomain,
    tags: [],
    importance: 3,
  } as Article;

  const results = await processArticlesInBatches([dummyArticle]);
  const processedResult: ProcessedArticle = {
    clean_summary: results[0].summary,
    domain: results[0].domain as Extract<ArticleDomain, "AI" | "Chips" | "Infra" | "Bio" | "Energy" | "Macro">,
    tags: results[0].tags,
    importance: results[0].importance as 1 | 2 | 3 | 4 | 5,
  };

  return processedResult;
}

export async function processArticlesInBatches(articles: Article[]) {
  pruneProcessedCache();
  const processed = [...articles];

  for (let index = 0; index < processed.length; index += 6) {
    const slice = processed.slice(index, index + 6);
    
    const uncached = slice.filter((article) => {
      const key = cacheKey(article);
      const cached = processedCache.get(key);
      return !(cached && cached.expiresAt > Date.now());
    });

    if (uncached.length > 0) {
      if (!client || Date.now() < aiDisabledUntil) {
        for (const article of uncached) {
          const key = cacheKey(article);
          setProcessedCache(key, fallbackArticle(article));
        }
      } else {
        try {
          const promptInput = JSON.stringify(
            uncached.map((a, idx) => ({
              id: String(idx),
              headline: a.headline,
              summary: a.summary,
              source: a.source ?? "Unknown",
            }))
          );

          const response = await client.chat.completions.create({
            model: AI_ARTICLE_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Articles to analyze:\n${promptInput}\n\nReturn JSON only.`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "article_intelligence",
                strict: true,
                schema: responseSchema,
              },
            },
            max_tokens: 1500,
          });

          const parsed = JSON.parse(response.choices[0].message.content || "{}") as {
            articles?: Array<{
              id: string;
              summary?: string;
              domain?: string;
              tags?: string[];
              importance?: number;
            }>;
          };

          const aiResults = parsed.articles || [];
          const aiByIndex = new Map<string, (typeof aiResults)[number]>();
          for (const item of aiResults) {
            if (item && typeof item.id === "string") {
              aiByIndex.set(item.id, item);
            }
          }

          for (let i = 0; i < uncached.length; i++) {
            const article = uncached[i];
            const key = cacheKey(article);
            const aiItem = aiByIndex.get(String(i)) ?? aiResults[i];

            let processedArticle: ProcessedArticle;

            if (aiItem) {
              processedArticle = {
                clean_summary: sentenceClamp(aiItem.summary ?? article.summary),
                domain: VALID_DOMAINS.includes((aiItem.domain ?? "Macro") as ArticleDomain)
                  ? (aiItem.domain as ProcessedArticle["domain"])
                  : "Macro",
                tags: normalizeTags(Array.isArray(aiItem.tags) ? aiItem.tags : []),
                importance:
                  typeof aiItem.importance === "number" &&
                  aiItem.importance >= 1 &&
                  aiItem.importance <= 5
                    ? (aiItem.importance as ProcessedArticle["importance"])
                    : 3,
              };
            } else {
              processedArticle = fallbackArticle(article);
            }

            setProcessedCache(key, processedArticle);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown AI error";
          console.error(`[ai] processArticlesInBatches failed: ${message}`);

          if (
            message.includes("429") ||
            message.includes("401") ||
            message.toLowerCase().includes("quota")
          ) {
            aiDisabledUntil = Date.now() + AI_FAILURE_COOLDOWN;
          }

          for (const article of uncached) {
            const key = cacheKey(article);
            setProcessedCache(key, fallbackArticle(article));
          }
        }
      }
    }

    for (let i = index; i < index + slice.length; i++) {
      const article = processed[i];
      const key = cacheKey(article);
      const cached = processedCache.get(key)!.value;

      processed[i] = {
        ...article,
        summary: cached.clean_summary,
        domain: cached.domain,
        tags: cached.tags,
        importance: cached.importance,
      };
    }
  }

  return processed;
}
