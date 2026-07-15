#!/usr/bin/env node
/**
 * One-off backfill: AI-enrich every existing article in place, using the local
 * Ollama model (electron/services/aiEnrichment.js). The normal refresh pipeline
 * is incremental and only enriches never-seen articles, so a bulk load done with
 * AI disabled (heuristics) never gets AI-enriched afterward. This script fixes
 * that for the already-stored backlog.
 *
 * Run with Electron's Node so it loads the electron-ABI better-sqlite3 build:
 *   ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron scripts/backfill-ai.cjs
 *
 * Safe to run while the desktop app is open: it uses WAL + a long busy_timeout,
 * writes in small chunks (brief locks), and persists progress as it goes.
 */

// Configure enrichment BEFORE requiring the module (its consts read env at load).
process.env.AI_KEEP_MODEL_LOADED = "1"; // don't unload the model between chunks
process.env.AI_TIMEOUT_MS = process.env.AI_TIMEOUT_MS || "180000"; // 3 min/batch
delete process.env.AI_DISABLED; // ensure enrichment actually runs

const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");
const {
  getRawArticleRows,
  upsertArticles,
} = require("../electron/repositories/articlesRepo");
const {
  enrichArticlesWithAI,
  unloadModel,
} = require("../electron/services/aiEnrichment");

const DB_PATH = path.join(
  os.homedir(),
  "Library/Application Support/monty-s-news-app/news-agg.sqlite",
);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 30000");

function tagsFor(ids) {
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT at.article_id, t.name FROM article_tags at
       JOIN tags t ON t.id = at.tag_id WHERE at.article_id IN (${placeholders})`,
    )
    .all(...ids);
  const map = new Map(ids.map((id) => [id, []]));
  for (const row of rows) map.get(row.article_id)?.push(row.name);
  return map;
}

const CHUNK = 30; // articles per persist step (5 model batches of 6)

(async () => {
  let rows = getRawArticleRows(db);
  const limit = Number(process.env.BACKFILL_LIMIT);
  if (Number.isFinite(limit) && limit > 0) rows = rows.slice(0, limit);
  const started = Date.now();
  console.log(`[backfill-ai] ${rows.length} articles to enrich via local model`);

  let done = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const tagMap = tagsFor(slice.map((r) => r.id));
    const inputs = slice.map((r) => ({
      id: r.id,
      headline: r.headline,
      summary: r.summary,
      source: r.source,
      url: r.url,
      domain: r.domain,
      importance: r.importance,
      personalized_score: r.personalized_score,
      published_at: r.published_at,
      processed_at: r.processed_at,
      raw_payload: r.raw_payload,
      tags: tagMap.get(r.id) ?? [],
    }));

    let enriched = inputs;
    try {
      enriched = await enrichArticlesWithAI(inputs);
    } catch (error) {
      console.warn(
        `[backfill-ai] chunk @${i} enrich failed: ${error.message}; keeping originals`,
      );
    }

    try {
      upsertArticles(db, enriched);
    } catch (error) {
      console.error(`[backfill-ai] chunk @${i} write failed: ${error.message}`);
    }

    done += slice.length;
    const mins = ((Date.now() - started) / 60000).toFixed(1);
    console.log(`[backfill-ai] ${done}/${rows.length} enriched (${mins} min elapsed)`);
  }

  await unloadModel().catch(() => {});
  db.close();
  console.log("[backfill-ai] complete");
})().catch((error) => {
  console.error("[backfill-ai] FATAL", error);
  process.exit(1);
});
