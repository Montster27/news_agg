import "server-only";

import { Pool } from "@neondatabase/serverless";
import type { WeeklyBrief } from "@/lib/brief";
import type { PatternAnalysis } from "@/lib/patterns";
import type { Article, ArticleDomain } from "@/lib/types";

const databaseUrl =
  process.env.POSTGRES_URL && process.env.POSTGRES_URL !== "your_vercel_db_url"
    ? process.env.POSTGRES_URL
    : null;

const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
let initialized = false;
let initPromise: Promise<void> | null = null;

type StoredPatternRow = {
  week: string;
  tag: string;
  count: number;
  delta: number;
  domain: string;
};

export type TagTrendPoint = {
  week: string;
  count: number;
};

export type LongTermTrend = {
  tag: string;
  points: TagTrendPoint[];
  first: number;
  last: number;
  delta: number;
  average: number;
};

export type LongTermTrendAnalysis = {
  rising: LongTermTrend[];
  declining: LongTermTrend[];
  stable: LongTermTrend[];
  available: boolean;
};

export function hasDatabase() {
  return Boolean(pool);
}

export async function initDb() {
  if (!pool) {
    return;
  }

  if (initialized) {
    return;
  }

  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        headline TEXT NOT NULL,
        summary TEXT NOT NULL,
        domain TEXT NOT NULL,
        tags JSONB NOT NULL,
        importance INTEGER NOT NULL,
        source TEXT,
        url TEXT UNIQUE NOT NULL,
        published_at TIMESTAMPTZ NOT NULL,
        processed_at TIMESTAMPTZ NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS patterns (
        id BIGSERIAL PRIMARY KEY,
        week TEXT NOT NULL,
        domain TEXT NOT NULL,
        tag TEXT NOT NULL,
        count INTEGER NOT NULL,
        delta INTEGER NOT NULL,
        UNIQUE (week, domain, tag)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS briefs (
        id BIGSERIAL PRIMARY KEY,
        week TEXT NOT NULL UNIQUE,
        content JSONB NOT NULL
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS articles_published_at_idx
      ON articles (published_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS articles_tags_gin_idx
      ON articles USING GIN (tags);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS patterns_week_domain_idx
      ON patterns (week DESC, domain);
    `);

    initialized = true;
    initPromise = null;
  })();

  await initPromise;
}

export async function saveArticlesToDb(articles: Article[]) {
  if (!pool || !articles.length) {
    return;
  }

  await initDb();

  for (const article of articles) {
    await pool.query(
      `
        INSERT INTO articles (
          id,
          headline,
          summary,
          domain,
          tags,
          importance,
          source,
          url,
          published_at,
          processed_at
        )
        VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10)
        ON CONFLICT (url) DO NOTHING
      `,
      [
        article.id,
        article.headline,
        article.summary,
        article.domain,
        JSON.stringify(article.tags),
        article.importance,
        article.source ?? null,
        article.url ?? article.id,
        article.date,
        article.processed_at,
      ],
    );
  }
}

function rowsFromAnalysis(analysis: PatternAnalysis): StoredPatternRow[] {
  const topTagCounts = new Map(analysis.topTags.map((entry) => [entry.tag, entry.count]));
  const deltas = new Map(analysis.trendingUp.map((entry) => [entry.tag, entry.delta]));
  const combinedTags = Array.from(new Set([...topTagCounts.keys(), ...deltas.keys()]));
  const week =
    analysis.generatedAt.slice(0, 10).replace(/-\d{2}$/, "") || analysis.generatedAt;

  return combinedTags.map((tag) => ({
    week,
    domain: analysis.domain,
    tag,
    count: topTagCounts.get(tag) ?? 0,
    delta: deltas.get(tag) ?? 0,
  }));
}

export async function savePatternSnapshot(analysis: PatternAnalysis) {
  if (!pool) {
    return;
  }

  await initDb();

  const rows = rowsFromAnalysis(analysis);
  for (const row of rows) {
    await pool.query(
      `
        INSERT INTO patterns (week, domain, tag, count, delta)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (week, domain, tag)
        DO UPDATE SET count = EXCLUDED.count, delta = EXCLUDED.delta
      `,
      [row.week, row.domain, row.tag, row.count, row.delta],
    );
  }
}

export async function saveBriefToDb(week: string, content: WeeklyBrief) {
  if (!pool) {
    return;
  }

  await initDb();
  await pool.query(
    `
      INSERT INTO briefs (week, content)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (week)
      DO UPDATE SET content = EXCLUDED.content
    `,
    [week, JSON.stringify(content)],
  );
}

export async function getTagTrend(
  tag: string,
  domain: ArticleDomain | "All" = "All",
  weeks = 12,
) {
  if (!pool) {
    return [];
  }

  await initDb();
  const params: Array<string | number> = [tag, weeks];
  const domainClause =
    domain === "All"
      ? ""
      : `AND domain = $${params.push(domain)}`;

  const result = await pool.query<TagTrendPoint>(
    `
      SELECT week, count
      FROM patterns
      WHERE tag = $1
      ${domainClause}
      ORDER BY week DESC
      LIMIT $2
    `,
    params,
  );

  return result.rows.reverse();
}

export async function analyzeLongTermTrends(
  domain: ArticleDomain | "All" = "All",
) : Promise<LongTermTrendAnalysis> {
  if (!pool) {
    return { rising: [], declining: [], stable: [], available: false };
  }

  await initDb();
  const params: Array<string | number> = [12];
  const domainClause =
    domain === "All"
      ? ""
      : `WHERE domain = $${params.push(domain)}`;

  const result = await pool.query<StoredPatternRow>(
    `
      SELECT week, tag, count, delta, domain
      FROM patterns
      ${domainClause}
      ORDER BY week DESC
      LIMIT $1 * 50
    `,
    params,
  );

  const grouped = new Map<string, TagTrendPoint[]>();

  for (const row of result.rows) {
    const current = grouped.get(row.tag) ?? [];
    current.push({ week: row.week, count: row.count });
    grouped.set(row.tag, current);
  }

  const trends = Array.from(grouped.entries()).map(([tag, points]) => {
    const sorted = [...points].sort((left, right) => left.week.localeCompare(right.week));
    const first = sorted[0]?.count ?? 0;
    const last = sorted.at(-1)?.count ?? 0;
    const average =
      sorted.reduce((sum, point) => sum + point.count, 0) / Math.max(sorted.length, 1);

    return {
      tag,
      points: sorted.slice(-12),
      first,
      last,
      delta: last - first,
      average,
    };
  });

  const rising = trends
    .filter((trend) => trend.points.length >= 2 && trend.delta >= 2)
    .sort((left, right) => right.delta - left.delta)
    .slice(0, 6);

  const declining = trends
    .filter((trend) => trend.points.length >= 2 && trend.delta <= -2)
    .sort((left, right) => left.delta - right.delta)
    .slice(0, 6);

  const stable = trends
    .filter((trend) => trend.points.length >= 3 && Math.abs(trend.delta) <= 1 && trend.average >= 2)
    .sort((left, right) => right.average - left.average)
    .slice(0, 6);

  return { rising, declining, stable, available: true };
}
