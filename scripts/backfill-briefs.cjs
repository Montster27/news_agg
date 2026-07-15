#!/usr/bin/env node
/**
 * Backfill weekly briefs: generate and save a brief for EVERY week present in the
 * article history, using the configured cloud model (Settings → Claude/OpenAI/
 * Gemini), with heuristic fallback when no provider is available. Existing cloud
 * briefs are kept unless FORCE_REGEN=1.
 *
 * The briefs table is keyed by week, so this preserves one brief per week — i.e.
 * "all the old weekly briefs" — and they remain readable in the app's Brief view.
 *
 * Run with Electron's Node (electron-ABI better-sqlite3):
 *   ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron scripts/backfill-briefs.cjs
 */

const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");
const { getArticles } = require("../electron/repositories/articlesRepo");
const {
  analyzeArticles,
  formatWeek,
  getBrief,
  saveBrief,
} = require("../electron/repositories/patternsRepo");
const { getPreferences } = require("../electron/repositories/preferencesRepo");
const { buildWeeklyBrief, resolveProvider } = require("../electron/services/briefService");

const DB_PATH = path.join(
  os.homedir(),
  "Library/Application Support/monty-s-news-app/news-agg.sqlite",
);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 30000");

// Group by the same ISO-week key saveBrief/getBrief use. Anchor at local noon so
// the calendar day (and thus the week) is stable regardless of timezone.
function weekOf(article) {
  const date = article.date ? new Date(`${article.date}T12:00:00`) : new Date();
  return formatWeek(date);
}

(async () => {
  const preferences = getPreferences(db);
  const resolved = resolveProvider(preferences);
  console.log(
    `[backfill-briefs] provider: ${resolved ? `${resolved.provider} (${resolved.model})` : "none — heuristic fallback"}`,
  );

  const articles = getArticles(db, { limit: 1000 });
  const byWeek = new Map();
  for (const article of articles) {
    const week = weekOf(article);
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week).push(article);
  }

  const weeks = [...byWeek.keys()].sort().reverse();
  console.log(
    `[backfill-briefs] ${articles.length} articles across ${weeks.length} week(s): ${weeks.join(", ")}`,
  );

  const force = process.env.FORCE_REGEN === "1";
  for (const week of weeks) {
    const weekArticles = byWeek.get(week);
    const existing = getBrief(db, week);

    if (existing && existing.used_fallback === false && !force) {
      console.log(
        `[backfill-briefs] ${week}: already has a cloud brief — skipping (FORCE_REGEN=1 to override)`,
      );
      continue;
    }

    const analysis = analyzeArticles(weekArticles, "All");
    const brief = await buildWeeklyBrief(db, { week, articles: weekArticles, analysis });
    saveBrief(db, week, brief);

    const via = brief.used_fallback ? "heuristic" : `${brief.provider}/${brief.model}`;
    console.log(
      `[backfill-briefs] ${week}: saved (${weekArticles.length} articles, via ${via})`,
    );
  }

  db.close();
  console.log("[backfill-briefs] complete");
})().catch((error) => {
  console.error("[backfill-briefs] FATAL", error);
  process.exit(1);
});
