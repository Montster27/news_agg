import "server-only";

import { Pool } from "pg";
import type { WeeklyBrief } from "@/lib/brief";
import type { PatternAnalysis } from "@/lib/patterns";
import type {
  Article,
  ArticleDomain,
  ConnectionStrength,
  ExtractedEntity,
  NarrativeThread,
  PersonalizationRule,
  StoryCluster,
  TrendSignal,
  UserAffinity,
  UserAffinityType,
  UserFeedback,
} from "@/lib/types";

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

type StoredStoryClusterRow = {
  id: string;
  headline: string;
  summary: string;
  why_it_matters: string[];
  domain: ArticleDomain;
  tags: string[];
  entities: ExtractedEntity[];
  sources: string[];
  source_count: number;
  confidence: StoryCluster["confidence"];
  impact_score: number;
  first_seen_at: string;
  last_seen_at: string;
  article_ids?: string[];
};

type StoredArticleRow = {
  id: string;
  headline: string;
  summary: string;
  domain: ArticleDomain;
  tags: string[];
  importance: Article["importance"];
  source: string | null;
  url: string | null;
  published_at: string;
  processed_at: string;
};

type StoredUserFeedbackRow = {
  id: number;
  cluster_id: string;
  action: string;
  value: number | null;
  created_at: string;
};

type StoredUserAffinityRow = {
  key: string;
  type: UserAffinityType;
  score: number;
  updated_at: string;
};

type StoredRuleRow = {
  id: number;
  type: PersonalizationRule["type"];
  field: PersonalizationRule["field"];
  value: string;
  weight: number;
};

type StoredNarrativeRow = {
  id: string;
  title: string;
  summary: string;
  direction: NarrativeThread["direction"];
  tags: string[];
  entities: ExtractedEntity[];
  cluster_ids: string[];
  timeline: NarrativeThread["timeline"];
  first_seen_at: string;
  last_seen_at: string;
  strength: number;
};

type StoredTrendSignalRow = {
  tag: string;
  direction: TrendSignal["direction"];
  velocity: number;
  current_count: number;
  previous_count: number;
  points: TrendSignal["points"];
  computed_at: string;
};

type StoredConnectionRow = {
  id: string;
  source: string;
  target: string;
  source_type: ConnectionStrength["sourceType"];
  target_type: ConnectionStrength["targetType"];
  weight: number;
  cluster_ids: string[];
  computed_at: string;
};

export type StoredInsight = {
  week: string;
  title: string;
  explanation: string;
  confidence: string;
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
      CREATE TABLE IF NOT EXISTS insights (
        id BIGSERIAL PRIMARY KEY,
        week TEXT NOT NULL,
        title TEXT NOT NULL,
        explanation TEXT NOT NULL,
        confidence TEXT NOT NULL,
        content JSONB NOT NULL,
        UNIQUE (week, title)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS story_clusters (
        id TEXT PRIMARY KEY,
        headline TEXT NOT NULL,
        summary TEXT NOT NULL,
        why_it_matters JSONB NOT NULL,
        domain TEXT NOT NULL,
        tags JSONB NOT NULL,
        entities JSONB NOT NULL,
        sources JSONB NOT NULL,
        source_count INTEGER NOT NULL,
        confidence TEXT NOT NULL,
        impact_score REAL NOT NULL,
        first_seen_at TIMESTAMPTZ NOT NULL,
        last_seen_at TIMESTAMPTZ NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS story_cluster_articles (
        cluster_id TEXT NOT NULL,
        article_id TEXT NOT NULL,
        PRIMARY KEY (cluster_id, article_id),
        FOREIGN KEY (cluster_id) REFERENCES story_clusters(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_feedback (
        id SERIAL PRIMARY KEY,
        cluster_id TEXT NOT NULL,
        action TEXT NOT NULL,
        value REAL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_affinity (
        key TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        score REAL NOT NULL,
        updated_at TIMESTAMPTZ
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rules (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        field TEXT NOT NULL,
        value TEXT NOT NULL,
        weight REAL NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS narrative_threads (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        direction TEXT NOT NULL,
        tags JSONB NOT NULL,
        entities JSONB NOT NULL,
        cluster_ids JSONB NOT NULL,
        timeline JSONB NOT NULL,
        first_seen_at TIMESTAMPTZ NOT NULL,
        last_seen_at TIMESTAMPTZ NOT NULL,
        strength REAL NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS trend_signals (
        tag TEXT PRIMARY KEY,
        direction TEXT NOT NULL,
        velocity REAL NOT NULL,
        current_count INTEGER NOT NULL,
        previous_count INTEGER NOT NULL,
        points JSONB NOT NULL,
        computed_at TIMESTAMPTZ NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        source_type TEXT NOT NULL,
        target_type TEXT NOT NULL,
        weight REAL NOT NULL,
        cluster_ids JSONB NOT NULL,
        computed_at TIMESTAMPTZ NOT NULL
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

    await pool.query(`
      CREATE INDEX IF NOT EXISTS story_clusters_impact_score_idx
      ON story_clusters (impact_score DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS story_clusters_last_seen_at_idx
      ON story_clusters (last_seen_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS story_clusters_domain_idx
      ON story_clusters (domain);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS user_feedback_cluster_id_idx
      ON user_feedback (cluster_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS user_feedback_created_at_idx
      ON user_feedback (created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS user_affinity_type_score_idx
      ON user_affinity (type, score DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS narrative_threads_strength_idx
      ON narrative_threads (strength DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS narrative_threads_last_seen_at_idx
      ON narrative_threads (last_seen_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS trend_signals_velocity_idx
      ON trend_signals (velocity DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS connections_weight_idx
      ON connections (weight DESC);
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
        ON CONFLICT (url) DO UPDATE SET
          summary = EXCLUDED.summary,
          domain = EXCLUDED.domain,
          tags = EXCLUDED.tags,
          importance = EXCLUDED.importance,
          processed_at = EXCLUDED.processed_at
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

function storyClusterFromRow(row: StoredStoryClusterRow): StoryCluster {
  return {
    id: row.id,
    headline: row.headline,
    summary: row.summary,
    whyItMatters: row.why_it_matters ?? [],
    domain: row.domain,
    tags: row.tags ?? [],
    entities: row.entities ?? [],
    articleIds: row.article_ids ?? [],
    sources: row.sources ?? [],
    sourceCount: row.source_count,
    confidence: row.confidence,
    impactScore: Number(row.impact_score),
    firstSeenAt: new Date(row.first_seen_at).toISOString(),
    lastSeenAt: new Date(row.last_seen_at).toISOString(),
  };
}

export async function saveStoryClustersToDb(clusters: StoryCluster[]) {
  if (!pool || !clusters.length) {
    return;
  }

  await initDb();

  for (const cluster of clusters) {
    await pool.query(
      `
        INSERT INTO story_clusters (
          id,
          headline,
          summary,
          why_it_matters,
          domain,
          tags,
          entities,
          sources,
          source_count,
          confidence,
          impact_score,
          first_seen_at,
          last_seen_at
        )
        VALUES ($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13)
        ON CONFLICT (id) DO UPDATE SET
          headline = EXCLUDED.headline,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          domain = EXCLUDED.domain,
          tags = EXCLUDED.tags,
          entities = EXCLUDED.entities,
          sources = EXCLUDED.sources,
          source_count = EXCLUDED.source_count,
          confidence = EXCLUDED.confidence,
          impact_score = EXCLUDED.impact_score,
          first_seen_at = LEAST(story_clusters.first_seen_at, EXCLUDED.first_seen_at),
          last_seen_at = GREATEST(story_clusters.last_seen_at, EXCLUDED.last_seen_at)
      `,
      [
        cluster.id,
        cluster.headline,
        cluster.summary,
        JSON.stringify(cluster.whyItMatters),
        cluster.domain,
        JSON.stringify(cluster.tags),
        JSON.stringify(cluster.entities),
        JSON.stringify(cluster.sources),
        cluster.sourceCount,
        cluster.confidence,
        cluster.impactScore,
        cluster.firstSeenAt,
        cluster.lastSeenAt,
      ],
    );

    await pool.query("DELETE FROM story_cluster_articles WHERE cluster_id = $1", [cluster.id]);

    for (const articleId of cluster.articleIds) {
      await pool.query(
        `
          INSERT INTO story_cluster_articles (cluster_id, article_id)
          VALUES ($1, $2)
          ON CONFLICT (cluster_id, article_id) DO NOTHING
        `,
        [cluster.id, articleId],
      );
    }
  }
}

export async function getLatestStoryClusters(
  domain: ArticleDomain | "All" = "All",
  limit = 25,
) {
  if (!pool) {
    return [];
  }

  await initDb();
  const params: Array<string | number> = [limit];
  const domainClause =
    domain === "All"
      ? ""
      : `WHERE c.domain = $${params.push(domain)}`;

  const result = await pool.query<StoredStoryClusterRow>(
    `
      SELECT
        c.*,
        COALESCE(json_agg(sca.article_id ORDER BY sca.article_id) FILTER (WHERE sca.article_id IS NOT NULL), '[]') AS article_ids
      FROM story_clusters c
      LEFT JOIN story_cluster_articles sca ON sca.cluster_id = c.id
      ${domainClause}
      GROUP BY c.id
      ORDER BY c.impact_score DESC, c.last_seen_at DESC
      LIMIT $1
    `,
    params,
  );

  return result.rows.map(storyClusterFromRow);
}

export async function getClusterArticles(clusterId: string) {
  if (!pool) {
    return [];
  }

  await initDb();
  const result = await pool.query<StoredArticleRow>(
    `
      SELECT a.*
      FROM story_cluster_articles sca
      JOIN articles a ON a.id = sca.article_id
      WHERE sca.cluster_id = $1
      ORDER BY a.published_at DESC
    `,
    [clusterId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    date: new Date(row.published_at).toISOString().slice(0, 10),
    processed_at: new Date(row.processed_at).toISOString(),
    week: new Date(row.published_at).toISOString().slice(0, 7),
    domain: row.domain,
    headline: row.headline,
    summary: row.summary,
    source: row.source ?? undefined,
    url: row.url ?? undefined,
    tags: row.tags ?? [],
    importance: row.importance,
  }));
}

function userFeedbackFromRow(row: StoredUserFeedbackRow): UserFeedback {
  return {
    id: row.id,
    clusterId: row.cluster_id,
    action: row.action,
    value: row.value,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function userAffinityFromRow(row: StoredUserAffinityRow): UserAffinity {
  return {
    key: row.key,
    type: row.type,
    score: Number(row.score),
    updatedAt: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : new Date().toISOString(),
  };
}

function ruleFromRow(row: StoredRuleRow): PersonalizationRule {
  return {
    id: row.id,
    type: row.type,
    field: row.field,
    value: row.value,
    weight: Number(row.weight),
  };
}

function narrativeFromRow(row: StoredNarrativeRow): NarrativeThread {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    direction: row.direction,
    tags: row.tags ?? [],
    entities: row.entities ?? [],
    clusterIds: row.cluster_ids ?? [],
    timeline: row.timeline ?? [],
    firstSeenAt: new Date(row.first_seen_at).toISOString(),
    lastSeenAt: new Date(row.last_seen_at).toISOString(),
    strength: Number(row.strength),
  };
}

function trendFromRow(row: StoredTrendSignalRow): TrendSignal {
  return {
    tag: row.tag,
    direction: row.direction,
    velocity: Number(row.velocity),
    current: Number(row.current_count),
    previous: Number(row.previous_count),
    points: row.points ?? [],
  };
}

function connectionFromRow(row: StoredConnectionRow): ConnectionStrength {
  return {
    id: row.id,
    source: row.source,
    target: row.target,
    sourceType: row.source_type,
    targetType: row.target_type,
    weight: Number(row.weight),
    clusterIds: row.cluster_ids ?? [],
  };
}

export async function saveUserFeedback(input: {
  clusterId: string;
  action: string;
  value?: number | null;
}) {
  if (!pool) {
    return null;
  }

  await initDb();
  const result = await pool.query<StoredUserFeedbackRow>(
    `
      INSERT INTO user_feedback (cluster_id, action, value)
      VALUES ($1, $2, $3)
      RETURNING id, cluster_id, action, value, created_at
    `,
    [input.clusterId, input.action, input.value ?? null],
  );

  return result.rows[0] ? userFeedbackFromRow(result.rows[0]) : null;
}

export async function getUserFeedback(limit = 250) {
  if (!pool) {
    return [];
  }

  await initDb();
  const result = await pool.query<StoredUserFeedbackRow>(
    `
      SELECT id, cluster_id, action, value, created_at
      FROM user_feedback
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [limit],
  );

  return result.rows.map(userFeedbackFromRow);
}

export async function updateAffinity(input: {
  key: string;
  type: UserAffinityType;
  delta?: number;
  score?: number;
}) {
  if (!pool) {
    return null;
  }

  await initDb();
  const score = Number(input.score ?? input.delta ?? 0);
  const useAbsoluteScore = input.score !== undefined;
  const result = await pool.query<StoredUserAffinityRow>(
    `
      INSERT INTO user_affinity (key, type, score, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (key) DO UPDATE SET
        type = EXCLUDED.type,
        score = CASE
          WHEN $4::boolean THEN EXCLUDED.score
          ELSE user_affinity.score + EXCLUDED.score
        END,
        updated_at = NOW()
      RETURNING key, type, score, updated_at
    `,
    [input.key, input.type, score, useAbsoluteScore],
  );

  return result.rows[0] ? userAffinityFromRow(result.rows[0]) : null;
}

export async function getAffinities() {
  if (!pool) {
    return [];
  }

  await initDb();
  const result = await pool.query<StoredUserAffinityRow>(
    `
      SELECT key, type, score, updated_at
      FROM user_affinity
      ORDER BY ABS(score) DESC, updated_at DESC
    `,
  );

  return result.rows.map(userAffinityFromRow);
}

export async function getRules() {
  if (!pool) {
    return [];
  }

  await initDb();
  const result = await pool.query<StoredRuleRow>(
    `
      SELECT id, type, field, value, weight
      FROM rules
      ORDER BY id ASC
    `,
  );

  return result.rows.map(ruleFromRow);
}

export async function saveNarratives(narratives: NarrativeThread[]) {
  if (!pool || !narratives.length) {
    return;
  }

  await initDb();

  for (const narrative of narratives) {
    await pool.query(
      `
        INSERT INTO narrative_threads (
          id,
          title,
          summary,
          direction,
          tags,
          entities,
          cluster_ids,
          timeline,
          first_seen_at,
          last_seen_at,
          strength
        )
        VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          direction = EXCLUDED.direction,
          tags = EXCLUDED.tags,
          entities = EXCLUDED.entities,
          cluster_ids = EXCLUDED.cluster_ids,
          timeline = EXCLUDED.timeline,
          first_seen_at = LEAST(narrative_threads.first_seen_at, EXCLUDED.first_seen_at),
          last_seen_at = GREATEST(narrative_threads.last_seen_at, EXCLUDED.last_seen_at),
          strength = EXCLUDED.strength
      `,
      [
        narrative.id,
        narrative.title,
        narrative.summary,
        narrative.direction,
        JSON.stringify(narrative.tags),
        JSON.stringify(narrative.entities),
        JSON.stringify(narrative.clusterIds),
        JSON.stringify(narrative.timeline),
        narrative.firstSeenAt,
        narrative.lastSeenAt,
        narrative.strength,
      ],
    );
  }
}

export async function getNarratives(limit = 12) {
  if (!pool) {
    return [];
  }

  await initDb();
  const result = await pool.query<StoredNarrativeRow>(
    `
      SELECT *
      FROM narrative_threads
      ORDER BY strength DESC, last_seen_at DESC
      LIMIT $1
    `,
    [limit],
  );

  return result.rows.map(narrativeFromRow);
}

export async function saveTrends(trends: TrendSignal[]) {
  if (!pool || !trends.length) {
    return;
  }

  await initDb();
  const computedAt = new Date().toISOString();

  for (const trend of trends) {
    await pool.query(
      `
        INSERT INTO trend_signals (
          tag,
          direction,
          velocity,
          current_count,
          previous_count,
          points,
          computed_at
        )
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
        ON CONFLICT (tag) DO UPDATE SET
          direction = EXCLUDED.direction,
          velocity = EXCLUDED.velocity,
          current_count = EXCLUDED.current_count,
          previous_count = EXCLUDED.previous_count,
          points = EXCLUDED.points,
          computed_at = EXCLUDED.computed_at
      `,
      [
        trend.tag,
        trend.direction,
        trend.velocity,
        trend.current,
        trend.previous,
        JSON.stringify(trend.points),
        computedAt,
      ],
    );
  }
}

export async function getTrends(limit = 12) {
  if (!pool) {
    return [];
  }

  await initDb();
  const result = await pool.query<StoredTrendSignalRow>(
    `
      SELECT *
      FROM trend_signals
      ORDER BY ABS(velocity) DESC, current_count DESC
      LIMIT $1
    `,
    [limit],
  );

  return result.rows.map(trendFromRow);
}

export async function saveConnections(connections: ConnectionStrength[]) {
  if (!pool || !connections.length) {
    return;
  }

  await initDb();
  const computedAt = new Date().toISOString();

  for (const connection of connections) {
    await pool.query(
      `
        INSERT INTO connections (
          id,
          source,
          target,
          source_type,
          target_type,
          weight,
          cluster_ids,
          computed_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
        ON CONFLICT (id) DO UPDATE SET
          source = EXCLUDED.source,
          target = EXCLUDED.target,
          source_type = EXCLUDED.source_type,
          target_type = EXCLUDED.target_type,
          weight = EXCLUDED.weight,
          cluster_ids = EXCLUDED.cluster_ids,
          computed_at = EXCLUDED.computed_at
      `,
      [
        connection.id,
        connection.source,
        connection.target,
        connection.sourceType,
        connection.targetType,
        connection.weight,
        JSON.stringify(connection.clusterIds),
        computedAt,
      ],
    );
  }
}

export async function getConnections(limit = 15) {
  if (!pool) {
    return [];
  }

  await initDb();
  const result = await pool.query<StoredConnectionRow>(
    `
      SELECT *
      FROM connections
      ORDER BY weight DESC
      LIMIT $1
    `,
    [limit],
  );

  return result.rows.map(connectionFromRow);
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

export async function saveInsightsToDb(
  week: string,
  insights: Array<{ title: string; explanation: string; confidence: string }>,
) {
  if (!pool || !insights.length) {
    return;
  }

  await initDb();

  for (const insight of insights) {
    await pool.query(
      `
        INSERT INTO insights (week, title, explanation, confidence, content)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        ON CONFLICT (week, title)
        DO UPDATE SET
          explanation = EXCLUDED.explanation,
          confidence = EXCLUDED.confidence,
          content = EXCLUDED.content
      `,
      [
        week,
        insight.title,
        insight.explanation,
        insight.confidence,
        JSON.stringify(insight),
      ],
    );
  }
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
