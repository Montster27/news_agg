import "server-only";

import OpenAI from "openai";
import { Article, ArticleDomain } from "@/lib/types";

const AI_MODEL = "gpt-5.4-mini";
const ONE_HOUR = 60 * 60 * 1000;
const GENERIC_TAGS = new Set(["ai", "technology", "startup", "news", "tech"]);
const VALID_DOMAINS: ArticleDomain[] = [
  "AI",
  "Chips",
  "Infra",
  "Bio",
  "Energy",
  "Macro",
];

type ArticleInput = Pick<Article, "headline" | "summary" | "source">;

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

const client =
  process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your_key_here"
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

const systemPrompt = `You are a technology analyst.

Your job:
- summarize tech news clearly
- classify into domains
- assign tags that reflect underlying trends

Be precise and consistent.`;

const responseSchema = {
  type: "object",
  properties: {
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
  required: ["summary", "domain", "tags", "importance"],
  additionalProperties: false,
} as const;

function cacheKey(article: ArticleInput) {
  return `${article.source ?? "unknown"}::${article.headline}`.toLowerCase();
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processArticle(article: ArticleInput): Promise<ProcessedArticle> {
  const key = cacheKey(article);
  const cached = processedCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (!client) {
    const fallback = fallbackArticle(article);
    processedCache.set(key, { value: fallback, expiresAt: Date.now() + ONE_HOUR });
    return fallback;
  }

  try {
    const response = await client.responses.create({
      model: AI_MODEL,
      instructions: systemPrompt,
      input: `Article:\nHeadline: ${article.headline}\nSource: ${article.source ?? "Unknown"}\nSummary: ${article.summary}\n\nReturn JSON only.`,
      text: {
        format: {
          type: "json_schema",
          name: "article_intelligence",
          strict: true,
          schema: responseSchema,
        },
      },
      max_output_tokens: 220,
    });

    const parsed = JSON.parse(response.output_text || "{}") as {
      summary?: string;
      domain?: string;
      tags?: string[];
      importance?: number;
    };

    const processed: ProcessedArticle = {
      clean_summary: sentenceClamp(parsed.summary ?? article.summary),
      domain: VALID_DOMAINS.includes((parsed.domain ?? "Macro") as ArticleDomain)
        ? ((parsed.domain ?? "Macro") as ProcessedArticle["domain"])
        : "Macro",
      tags: normalizeTags(Array.isArray(parsed.tags) ? parsed.tags : []),
      importance:
        typeof parsed.importance === "number" &&
        parsed.importance >= 1 &&
        parsed.importance <= 5
          ? (parsed.importance as ProcessedArticle["importance"])
          : 3,
    };

    processedCache.set(key, {
      value: processed,
      expiresAt: Date.now() + ONE_HOUR,
    });

    return processed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    console.error(`[ai] processArticle failed: ${message}`);

    const fallback = fallbackArticle(article);
    processedCache.set(key, { value: fallback, expiresAt: Date.now() + ONE_HOUR });
    return fallback;
  }
}

export async function processArticlesInBatches(articles: Article[]) {
  const limit = Math.min(articles.length, 12);
  const processed = [...articles];

  for (let index = 0; index < limit; index += 4) {
    const slice = processed.slice(index, index + 4);
    const enriched = await Promise.all(
      slice.map(async (article) => {
        const aiResult = await processArticle(article);

        return {
          ...article,
          summary: aiResult.clean_summary,
          domain: aiResult.domain,
          tags: aiResult.tags,
          importance: aiResult.importance,
        };
      }),
    );

    processed.splice(index, enriched.length, ...enriched);

    if (index + 4 < limit) {
      await delay(250);
    }
  }

  return processed;
}
