import { processArticlesInBatches } from "@/lib/ai";
import Parser from "rss-parser";
import { fallbackArticles } from "@/lib/data";
import { sources, type RssSource } from "@/lib/sources";
import { Article } from "@/lib/types";

const parser = new Parser();
const ONE_HOUR = 60 * 60 * 1000;
const MAX_ARTICLES_PER_SOURCE = 5;
const MAX_DASHBOARD_ARTICLES = 30;

type ArticleCache = {
  articles: Article[];
  fetchedAt: string;
};

let articleCache: ArticleCache | null = null;

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function createSummary(item: {
  contentSnippet?: string;
  content?: string;
  summary?: string;
}) {
  const raw = item.contentSnippet || item.summary || item.content || "";
  const cleaned = stripHtml(raw);

  if (!cleaned) {
    return "Summary unavailable for this feed item.";
  }

  return cleaned.slice(0, 280);
}

function normalizeItem(source: RssSource, item: Parser.Item): Article | null {
  const headline = item.title?.trim();
  const url = item.link?.trim();

  if (!headline || !url) {
    return null;
  }

  const rawDate = item.isoDate || item.pubDate;
  const date = rawDate
    ? new Date(rawDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return {
    id: `${source.name}-${headline}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    headline,
    summary: createSummary(item),
    source: source.name,
    url,
    date,
    domain: source.category,
    tags: ["uncategorized"],
    importance: 3,
  };
}

async function fetchFeed(source: RssSource) {
  try {
    const response = await fetch(source.url, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml",
        "User-Agent": "news-agg-rss-ingestor/1.0",
      },
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      console.error(`[rss] ${source.name} failed with status ${response.status}`);
      return [];
    }

    const xml = await response.text();
    let feed: Parser.Output<Parser.Item>;

    try {
      feed = await parser.parseString(xml);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown parse error";
      console.error(`[rss] ${source.name} parse failed: ${message}`);
      return [];
    }

    return (feed.items ?? [])
      .slice(0, MAX_ARTICLES_PER_SOURCE)
      .map((item) => normalizeItem(source, item))
      .filter((article): article is Article => article !== null);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    console.error(`[rss] ${source.name} failed: ${message}`);
    return [];
  }
}

function dedupeArticles(articles: Article[]) {
  const seenHeadlines = new Set<string>();

  return articles.filter((article) => {
    const key = article.headline.trim().toLowerCase();

    if (seenHeadlines.has(key)) {
      return false;
    }

    seenHeadlines.add(key);
    return true;
  });
}

export async function ingestFeeds() {
  if (
    articleCache &&
    Date.now() - new Date(articleCache.fetchedAt).getTime() < ONE_HOUR
  ) {
    return articleCache;
  }

  const settled = await Promise.all(sources.map((source) => fetchFeed(source)));
  const deduped = dedupeArticles(settled.flat())
    .sort((left, right) => {
      return new Date(right.date).getTime() - new Date(left.date).getTime();
    })
    .slice(0, MAX_DASHBOARD_ARTICLES);

  const enriched = await processArticlesInBatches(deduped);

  const nextCache = {
    articles: enriched.length ? enriched : fallbackArticles,
    fetchedAt: new Date().toISOString(),
  };

  articleCache = nextCache;
  return nextCache;
}

export function getCachedArticles() {
  return articleCache;
}
