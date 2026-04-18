import { processArticlesInBatches } from "@/lib/ai";
import { saveArticlesToDb } from "@/lib/db";
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

export function formatWeek(value: Date) {
  const utcDate = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-${String(weekNumber).padStart(2, "0")}`;
}

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
  const parsedDate = rawDate ? new Date(rawDate) : new Date();
  const date = parsedDate.toISOString().slice(0, 10);
  const processedAt = new Date().toISOString();

  return {
    id: `${source.name}-${headline}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    headline,
    summary: createSummary(item),
    source: source.name,
    url,
    date,
    processed_at: processedAt,
    week: formatWeek(parsedDate),
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

  await saveArticlesToDb(nextCache.articles);
  articleCache = nextCache;
  return nextCache;
}

export function getCachedArticles() {
  return articleCache;
}
