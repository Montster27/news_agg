// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const { runMigrations } = require("./migrations");
const {
  getArticles,
  upsertArticles,
} = require("./repositories/articlesRepo");
const {
  querySearch,
  rebuildSearchIndex,
  relatedArticles,
  recentSearches,
  saveSearch,
  savedSearches,
  searchStats,
} = require("./repositories/searchRepo");
const {
  getAffinities,
  getLastRefreshStats,
  getImportanceFeedback,
  getRules,
  getUserFeedback,
  saveImportanceFeedback,
  saveUserFeedback,
} = require("./repositories/preferencesRepo");
const {
  createSnapshot,
  exportSnapshot,
  importSnapshot,
} = require("./services/importExportService");
const { createRefreshService, fetchAllFeeds } = require("./services/refreshService");

const dbs: Array<unknown> = [];

function createDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  dbs.push(db);
  return db;
}

function sampleArticle(overrides = {}) {
  return {
    id: "article-1",
    headline: "OpenAI expands AI infrastructure plans",
    summary: "A new data center plan puts power and chips back in focus.",
    domain: "AI",
    source: "Test Source",
    url: "https://example.com/openai-infra",
    importance: 5,
    personalized_score: 6.2,
    published_at: "2026-04-18T12:00:00.000Z",
    processed_at: "2026-04-18T12:05:00.000Z",
    tags: ["ai_infrastructure", "energy_constraint"],
    ...overrides,
  };
}

function unconstrainedResourceMonitor() {
  return {
    getMemoryState: () => ({
      constrained: false,
      reasons: [],
      rssMb: 120,
      heapUsedMb: 40,
      systemFreeMemoryMb: 4096,
      systemTotalMemoryMb: 8192,
      minFreeMemoryMb: 768,
      maxProcessRssMb: 1024,
    }),
    start: () => "sample",
    finish: () => null,
  };
}

afterEach(() => {
  while (dbs.length) {
    dbs.pop()?.close();
  }
});

describe("Electron Phase 2 local data layer", () => {
  it("runs migrations idempotently", () => {
    const db = createDb();
    runMigrations(db);

    const version = db.prepare("SELECT max(version) AS version FROM schema_version").get();
    const articles = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'articles'").get();

    expect(version.version).toBe(3);
    expect(articles.name).toBe("articles");
  });

  it("dedupes articles by URL and preserves tag joins", () => {
    const db = createDb();

    upsertArticles(db, [
      sampleArticle(),
      sampleArticle({
        id: "article-duplicate",
        headline: "Updated OpenAI infrastructure headline",
        tags: ["chips", "ai_infrastructure"],
      }),
    ]);

    const articles = getArticles(db, { tag: "ai_infrastructure", limit: 10 });
    const chipArticles = getArticles(db, { tag: "chips", limit: 10 });

    expect(articles).toHaveLength(1);
    expect(articles[0].headline).toBe("Updated OpenAI infrastructure headline");
    expect(articles[0].tags).toEqual(["ai_infrastructure", "chips"]);
    expect(chipArticles).toHaveLength(1);
  });

  it("persists importance feedback", () => {
    const db = createDb();
    upsertArticles(db, [sampleArticle()]);

    const result = saveImportanceFeedback(db, {
      articleId: "article-1",
      originalImportance: 5,
      userImportance: 3,
    });
    const feedback = getImportanceFeedback(db);

    expect(result.success).toBe(true);
    expect(feedback["article-1"].userImportance).toBe(3);
  });

  it("persists cluster feedback and updates affinities", () => {
    const db = createDb();
    const result = saveUserFeedback(db, {
      clusterId: "cluster-openai-infra",
      action: "boost",
      cluster: {
        id: "cluster-openai-infra",
        tags: ["ai_infrastructure"],
        entities: [{ name: "OpenAI", normalized: "openai" }],
        impactScore: 6,
      },
    });
    const feedback = getUserFeedback(db);
    const affinities = getAffinities(db);
    const rules = getRules(db);

    expect(result.success).toBe(true);
    expect(feedback[0].clusterId).toBe("cluster-openai-infra");
    expect(affinities.some((affinity) => affinity.key === "openai")).toBe(true);
    expect(rules).toEqual([]);
  });

  it("round-trips JSON import and export", async () => {
    const sourceDb = createDb();
    const targetDb = createDb();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "news-agg-export-"));
    const filePath = path.join(tmpDir, "snapshot.json");

    upsertArticles(sourceDb, [sampleArticle()]);
    await exportSnapshot(sourceDb, filePath);
    const result = await importSnapshot(targetDb, filePath);
    const snapshot = createSnapshot(targetDb);

    expect(result.success).toBe(true);
    expect(snapshot.data.articles).toHaveLength(1);
    expect(snapshot.data.articles[0].url).toBe("https://example.com/openai-infra");
  });

  it("prevents overlapping refresh jobs", async () => {
    const db = createDb();
    let releaseFetch: () => void = () => {};
    const refreshService = createRefreshService({
      db,
      resourceMonitor: unconstrainedResourceMonitor(),
      fetchAllFeeds: () =>
        new Promise((resolve) => {
          releaseFetch = () =>
            resolve([
              {
                articles: [sampleArticle()],
                error: null,
              },
            ]);
        }),
    });

    const first = refreshService.runRefresh({ manual: true });
    const second = await refreshService.runRefresh({ manual: true });
    releaseFetch();
    const firstResult = await first;

    expect(second.skipped).toBe(true);
    expect(firstResult.success).toBe(true);
    expect(firstResult.inserted).toBe(1);
  });

  it("skips automated refresh jobs on battery power", async () => {
    const db = createDb();
    let fetched = false;
    const refreshService = createRefreshService({
      db,
      getPowerState: () => ({ source: "battery", onBattery: true }),
      fetchAllFeeds: () => {
        fetched = true;
        return Promise.resolve([{ articles: [sampleArticle()], error: null }]);
      },
    });

    const result = await refreshService.runRefresh({ scheduled: true });
    const stored = getLastRefreshStats(db);

    expect(fetched).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("battery");
    expect(result.power.onBattery).toBe(true);
    expect(stored.skipReason).toBe("battery");
  });

  it("skips refresh jobs when memory pressure is high", async () => {
    const db = createDb();
    let fetched = false;
    const memoryState = {
      constrained: true,
      reasons: ["system free memory below 768 MB"],
      rssMb: 420,
      heapUsedMb: 120,
      systemFreeMemoryMb: 256,
      systemTotalMemoryMb: 8192,
      minFreeMemoryMb: 768,
      maxProcessRssMb: 1024,
    };
    const refreshService = createRefreshService({
      db,
      resourceMonitor: {
        getMemoryState: () => memoryState,
      },
      fetchAllFeeds: () => {
        fetched = true;
        return Promise.resolve([{ articles: [sampleArticle()], error: null }]);
      },
    });

    const result = await refreshService.runRefresh({ manual: true });
    const stored = getLastRefreshStats(db);

    expect(fetched).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("memory");
    expect(result.memory).toEqual(memoryState);
    expect(stored.skipReason).toBe("memory");
  });

  it("throttles feed fetching concurrency", async () => {
    let active = 0;
    let maxActive = 0;
    const sourceList = Array.from({ length: 7 }, (_value, index) => ({
      name: `Source ${index}`,
      url: `https://example.com/${index}`,
      category: "AI",
    }));

    const results = await fetchAllFeeds(
      {},
      {
        sourceList,
        maxConcurrentFeeds: 2,
        batchPauseMs: 0,
        fetchFeedFn: async (source) => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active -= 1;
          return {
            articles: [sampleArticle({ id: source.name, url: source.url })],
            error: null,
          };
        },
      },
    );

    expect(maxActive).toBeLessThanOrEqual(2);
    expect(results).toHaveLength(sourceList.length);
  });

  it("tracks incoming article counts and refresh resource impact", async () => {
    const db = createDb();
    const resourceImpact = {
      durationMs: 1200,
      cpuUserMs: 20,
      cpuSystemMs: 10,
      cpuTotalMs: 30,
      cpuPercent: 2.5,
      rssMb: 160,
      rssDeltaMb: 4.2,
      heapUsedMb: 48,
      heapUsedDeltaMb: 1.1,
      systemFreeMemoryMb: 2400,
      systemFreeMemoryDeltaMb: -4.4,
    };
    const refreshService = createRefreshService({
      db,
      getPowerState: () => ({ source: "battery", onBattery: true }),
      resourceMonitor: {
        start: () => "sample",
        finish: (sample) => (sample === "sample" ? resourceImpact : null),
      },
      fetchAllFeeds: () =>
        Promise.resolve([
          {
            articles: [sampleArticle()],
            error: null,
          },
        ]),
    });

    const result = await refreshService.runRefresh({ manual: true });
    const stored = getLastRefreshStats(db);

    expect(result.success).toBe(true);
    expect(result.incoming).toBe(1);
    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.resourceImpact).toEqual(resourceImpact);
    expect(stored.resourceImpact).toEqual(resourceImpact);
  });

  it("populates the FTS index when articles are upserted", () => {
    const db = createDb();

    upsertArticles(db, [sampleArticle()]);
    const stats = searchStats(db);

    expect(stats.indexedCount).toBe(1);
    expect(stats.articleCount).toBe(1);
  });

  it("queries articles by keyword and phrase", () => {
    const db = createDb();

    upsertArticles(db, [
      sampleArticle(),
      sampleArticle({
        id: "article-2",
        headline: "Graphene commercialization reaches pilot scale",
        summary: "Battery materials companies announced a new manufacturing line.",
        domain: "Energy",
        source: "Materials Weekly",
        url: "https://example.com/graphene",
        importance: 4,
        personalized_score: 4.1,
        tags: ["graphene", "commercialization"],
      }),
    ]);

    const keywordResults = querySearch(db, { q: "graphene", limit: 10 });
    const phraseResults = querySearch(db, { q: "\"data center plan\"", limit: 10 });

    expect(keywordResults).toHaveLength(1);
    expect(keywordResults[0].articleId).toBe("article-2");
    expect(phraseResults).toHaveLength(1);
    expect(phraseResults[0].articleId).toBe("article-1");
    expect(phraseResults[0].matchSnippet).toContain("[[[");
  });

  it("applies domain, tag, date, importance, and personalized filters", () => {
    const db = createDb();

    upsertArticles(db, [
      sampleArticle(),
      sampleArticle({
        id: "article-2",
        headline: "AI chip packaging suppliers add capacity",
        summary: "Advanced packaging capacity expands for accelerators.",
        domain: "Chips",
        source: "Chip Wire",
        url: "https://example.com/chips",
        importance: 3,
        personalized_score: 3.1,
        published_at: "2026-03-01T12:00:00.000Z",
        tags: ["chips", "advanced_packaging"],
      }),
      sampleArticle({
        id: "article-3",
        headline: "CRISPR regulation debate advances",
        summary: "New guidance arrives for clinical editing studies.",
        domain: "Bio",
        source: "Bio Wire",
        url: "https://example.com/crispr",
        importance: 4,
        personalized_score: 3.5,
        published_at: "2026-04-17T12:00:00.000Z",
        tags: ["crispr", "regulation"],
      }),
    ]);

    const results = querySearch(db, {
      q: "ai chips regulation",
      domains: ["AI", "Bio"],
      tags: ["regulation"],
      dateFrom: "2026-04-01",
      dateTo: "2026-04-30",
      minImportance: 4,
      personalizedOnly: false,
      limit: 10,
    });
    const personalized = querySearch(db, {
      q: "infrastructure",
      personalizedOnly: true,
      limit: 10,
    });

    expect(results).toHaveLength(1);
    expect(results[0].articleId).toBe("article-3");
    expect(personalized).toHaveLength(1);
    expect(personalized[0].articleId).toBe("article-1");
  });

  it("retrieves related articles using local overlap signals", () => {
    const db = createDb();

    upsertArticles(db, [
      sampleArticle(),
      sampleArticle({
        id: "article-2",
        headline: "Power constraints shape AI infrastructure buildouts",
        summary: "Data center operators are prioritizing grid access.",
        domain: "AI",
        source: "Infra Wire",
        url: "https://example.com/related",
        importance: 4,
        published_at: "2026-04-16T12:00:00.000Z",
        tags: ["ai_infrastructure", "energy_constraint"],
      }),
      sampleArticle({
        id: "article-3",
        headline: "Graphene battery manufacturing update",
        summary: "Materials companies announced new pilots.",
        domain: "Energy",
        source: "Materials Weekly",
        url: "https://example.com/unrelated",
        importance: 5,
        published_at: "2026-04-16T12:00:00.000Z",
        tags: ["graphene"],
      }),
    ]);

    const results = relatedArticles(db, "article-1");

    expect(results.map((result) => result.articleId)).toContain("article-2");
    expect(results.map((result) => result.articleId)).not.toContain("article-3");
  });

  it("stores recent and saved searches", () => {
    const db = createDb();

    upsertArticles(db, [sampleArticle()]);
    querySearch(db, {
      q: "AI infrastructure",
      tags: ["ai_infrastructure"],
      limit: 10,
    });
    const saveResult = saveSearch(db, {
      name: "AI infra energy",
      queryText: "AI infrastructure",
      filters: { tags: ["ai_infrastructure"] },
    });

    expect(saveResult.success).toBe(true);
    expect(recentSearches(db)).toHaveLength(1);
    expect(recentSearches(db)[0].queryText).toBe("AI infrastructure");
    expect(savedSearches(db)[0].name).toBe("AI infra energy");
  });

  it("rebuilds the search index safely", () => {
    const db = createDb();

    upsertArticles(db, [sampleArticle()]);
    db.prepare("DELETE FROM article_search").run();
    expect(searchStats(db).indexedCount).toBe(0);

    const count = rebuildSearchIndex(db);

    expect(count).toBe(1);
    expect(searchStats(db).indexedCount).toBe(1);
    expect(querySearch(db, { q: "OpenAI", limit: 10 })).toHaveLength(1);
  });
});
