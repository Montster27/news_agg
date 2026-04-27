// /Users/montysharma/Documents/news_agg/news_agg/components/ScanViewClient.tsx

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ImportanceEditor } from "@/components/ImportanceEditor";
import { RecallActionBar } from "@/components/RecallActionBar";
import { Tag } from "@/components/Tag";
import {
  RECALL_IMPORT_URL,
  buildBookmarksHtml,
  buildExportFilename,
} from "@/lib/recall";
import {
  getLearnedAdjustment,
  getLearningExplanation,
  loadImportanceFeedback,
  loadLearningProfile,
  rebuildLearningProfile,
  resetUserImportance,
  saveLearningProfile,
  setUserImportance,
  type ImportanceLearningProfile,
} from "@/lib/feedback";
import {
  ARTICLE_DOMAINS,
  DOMAIN_LABELS,
  type Article,
  type ArticleDomain,
  type ImportanceFeedback,
} from "@/lib/types";

type ViewMode = "grid" | "headlines";
const HEADLINES_PAGE = 40;

// ─── Domain color map ────────────────────────────────────────
const DOMAIN_COLORS: Record<string, string> = {
  AIUse: "bg-violet-50 border-violet-200 text-violet-800",
  LLM: "bg-purple-50 border-purple-200 text-purple-800",
  AIInfra: "bg-indigo-50 border-indigo-200 text-indigo-800",
  Semis: "bg-blue-50 border-blue-200 text-blue-800",
  Cloud: "bg-sky-50 border-sky-200 text-sky-800",
  Security: "bg-red-50 border-red-200 text-red-800",
  Consumer: "bg-pink-50 border-pink-200 text-pink-800",
  Bio: "bg-green-50 border-green-200 text-green-800",
  Climate: "bg-emerald-50 border-emerald-200 text-emerald-800",
  Crypto: "bg-amber-50 border-amber-200 text-amber-800",
  Policy: "bg-orange-50 border-orange-200 text-orange-800",
  Space: "bg-teal-50 border-teal-200 text-teal-800",
  Robotics: "bg-cyan-50 border-cyan-200 text-cyan-800",
  Batteries: "bg-lime-50 border-lime-200 text-lime-800",
  AR: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800",
  General: "bg-slate-50 border-slate-200 text-slate-700",
};

const DOMAIN_ACCENT: Record<string, string> = {
  AIUse: "bg-violet-500",
  LLM: "bg-purple-600",
  AIInfra: "bg-indigo-600",
  Semis: "bg-blue-500",
  Cloud: "bg-sky-500",
  Security: "bg-red-500",
  Consumer: "bg-pink-500",
  Bio: "bg-green-500",
  Climate: "bg-emerald-500",
  Crypto: "bg-amber-500",
  Policy: "bg-orange-500",
  Space: "bg-teal-500",
  Robotics: "bg-cyan-500",
  Batteries: "bg-lime-500",
  AR: "bg-fuchsia-500",
  General: "bg-slate-400",
};

const DOMAIN_BADGE: Record<string, string> = {
  AIUse: "bg-violet-100 text-violet-700",
  LLM: "bg-purple-100 text-purple-700",
  AIInfra: "bg-indigo-100 text-indigo-700",
  Semis: "bg-blue-100 text-blue-700",
  Cloud: "bg-sky-100 text-sky-700",
  Security: "bg-red-100 text-red-700",
  Consumer: "bg-pink-100 text-pink-700",
  Bio: "bg-green-100 text-green-700",
  Climate: "bg-emerald-100 text-emerald-700",
  Crypto: "bg-amber-100 text-amber-700",
  Policy: "bg-orange-100 text-orange-700",
  Space: "bg-teal-100 text-teal-700",
  Robotics: "bg-cyan-100 text-cyan-700",
  Batteries: "bg-lime-100 text-lime-700",
  AR: "bg-fuchsia-100 text-fuchsia-700",
  General: "bg-slate-100 text-slate-600",
};

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type SectorData = {
  domain: ArticleDomain;
  articles: Article[];
  topHeadlines: Article[];
  topTag: string | null;
  articleCount: number;
};

export function ScanViewClient() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [mode, setMode] = useState<ViewMode>("grid");
  const [headlineCount, setHeadlineCount] = useState(HEADLINES_PAGE);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, ImportanceFeedback>>({});
  const [learningProfile, setLearningProfile] =
    useState<ImportanceLearningProfile>(loadLearningProfile);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState<ArticleDomain | "All">("All");
  const [selectedRecallIds, setSelectedRecallIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [recallNotice, setRecallNotice] = useState<string | null>(null);

  // ── Load data ─────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    if (window.desktop) {
      const [localArticles, storedFeedback] = await Promise.all([
        window.desktop.data.getArticles({ limit: 500 }),
        window.desktop.data.getImportanceFeedback(),
      ]);
      setArticles(localArticles);
      setFeedbackMap(storedFeedback);
      const learned = rebuildLearningProfile(localArticles, storedFeedback);
      setLearningProfile(learned);
      saveLearningProfile(learned);
    } else {
      setFeedbackMap(loadImportanceFeedback());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!window.desktop) return;
    const unsub = window.desktop.jobs.onRefreshComplete(() => {
      void loadData();
    });
    return unsub;
  }, [loadData]);

  // ── Sector data for grid view ─────────────────────────────
  const sectors = useMemo<SectorData[]>(() => {
    const map = new Map<ArticleDomain, Article[]>();
    for (const d of ARTICLE_DOMAINS) map.set(d, []);
    for (const a of articles) {
      map.get(a.domain)?.push(a);
    }

    return ARTICLE_DOMAINS
      .map((domain) => {
        const domainArticles = (map.get(domain) ?? []).sort(
          (a, b) => b.importance - a.importance ||
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        const tagCounts = new Map<string, number>();
        for (const a of domainArticles) {
          for (const t of a.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
        }
        const topTag = [...tagCounts.entries()]
          .filter(([t]) => t !== "uncategorized" && t !== "tech_monitoring")
          .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

        return {
          domain,
          articles: domainArticles,
          topHeadlines: domainArticles.slice(0, 3),
          topTag,
          articleCount: domainArticles.length,
        };
      })
      .filter((s) => s.articleCount > 0)
      .sort((a, b) => b.articleCount - a.articleCount);
  }, [articles]);

  // ── Sorted articles for headlines view ────────────────────
  const sortedArticles = useMemo(() => {
    const filtered = domainFilter === "All"
      ? articles
      : articles.filter((a) => a.domain === domainFilter);
    return [...filtered].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [articles, domainFilter]);

  const visibleHeadlines = useMemo(
    () => sortedArticles.slice(0, headlineCount),
    [sortedArticles, headlineCount],
  );

  // ── Importance handlers ───────────────────────────────────
  const handleImportanceChange = (article: Article, userImportance: 1 | 2 | 3 | 4 | 5) => {
    const trueOriginal = article.originalImportance ?? article.importance;
    const next = setUserImportance(article.id, trueOriginal, userImportance, feedbackMap);
    setFeedbackMap(next);
    const learned = rebuildLearningProfile(articles, next);
    setLearningProfile(learned);
    saveLearningProfile(learned);
    void window.desktop?.data.saveImportanceFeedback({
      articleId: article.id,
      originalImportance: trueOriginal,
      userImportance,
    });
  };

  const handleImportanceReset = (article: Article) => {
    const next = resetUserImportance(article.id, feedbackMap);
    setFeedbackMap(next);
    const learned = rebuildLearningProfile(articles, next);
    setLearningProfile(learned);
    saveLearningProfile(learned);
    void window.desktop?.data.saveImportanceFeedback({
      articleId: article.id,
      reset: true,
    });
  };

  // ── Recall send handlers ──────────────────────────────────
  const toggleRecallSelect = useCallback((articleId: string) => {
    setSelectedRecallIds((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });
  }, []);

  const clearRecallSelect = useCallback(() => {
    setSelectedRecallIds(() => new Set());
  }, []);

  const handleSendToRecall = useCallback(async () => {
    if (selectedRecallIds.size === 0) return;
    const articleMap = new Map(articles.map((article) => [article.id, article]));
    const selectedArticles = Array.from(selectedRecallIds)
      .map((id) => articleMap.get(id))
      .filter((article): article is Article => Boolean(article && article.url));

    if (selectedArticles.length === 0) {
      setRecallNotice("No selected articles have URLs to export.");
      return;
    }

    const now = new Date();
    const html = buildBookmarksHtml(selectedArticles, now);
    const filename = buildExportFilename(now);

    const desktopExport = window.desktop?.exports?.exportRecallBookmarks;
    if (typeof desktopExport === "function") {
      const result = await desktopExport({ html, filename });
      if (!result.success) {
        setRecallNotice(result.error ?? "Export canceled.");
        return;
      }
    } else {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    }

    setRecallNotice(
      `Saved ${selectedArticles.length} URLs. In Recall: Add Content → Import → Import Bookmarks → choose this file.`,
    );
    window.open(RECALL_IMPORT_URL, "_blank", "noopener,noreferrer");
    clearRecallSelect();
  }, [articles, clearRecallSelect, selectedRecallIds]);

  // ── Active domains for filter pills ───────────────────────
  const activeDomains = useMemo(
    () => [...new Set(articles.map((a) => a.domain))].sort(),
    [articles],
  );

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════
  return (
    <AppShell activePath="/scan">
      <div className="space-y-5">
        {/* ── Header ──────────────────────────────────────────── */}
        <header className="surface-card p-5 sm:p-6">
          <p className="section-kicker">Scan</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {mode === "grid" ? "Sector Briefing" : "Headline Stream"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {mode === "grid"
              ? "One card per sector — scan everything in 30 seconds."
              : "Every article, one line each. Click to open, rate to teach."}
          </p>

          {/* Mode toggle */}
          <div className="mt-4 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setMode("grid")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                mode === "grid"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sector Grid
            </button>
            <button
              type="button"
              onClick={() => setMode("headlines")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                mode === "headlines"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Headlines
            </button>
          </div>

          {/* Domain filter (headlines mode) */}
          {mode === "headlines" ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDomainFilter("All")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  domainFilter === "All"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All
              </button>
              {activeDomains.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDomainFilter(d)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    domainFilter === d
                      ? "bg-sky-600 text-white"
                      : `${DOMAIN_BADGE[d] ?? "bg-slate-100 text-slate-600"} hover:opacity-80`
                  }`}
                >
                  {DOMAIN_LABELS[d] ?? d}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-3 text-xs text-slate-400">
            {articles.length} articles across {sectors.length} sectors
            {loading ? " · loading…" : ""}
          </div>
        </header>

        {/* ── GRID VIEW ───────────────────────────────────────── */}
        {mode === "grid" ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sectors.map((sector) => (
              <button
                key={sector.domain}
                type="button"
                onClick={() => {
                  setDomainFilter(sector.domain);
                  setMode("headlines");
                  setHeadlineCount(HEADLINES_PAGE);
                }}
                className={`group rounded-xl border p-4 text-left transition hover:shadow-md ${
                  DOMAIN_COLORS[sector.domain] ?? DOMAIN_COLORS.General
                }`}
              >
                {/* Domain header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${DOMAIN_ACCENT[sector.domain] ?? DOMAIN_ACCENT.General}`} />
                    <span className="text-sm font-bold tracking-wide">{DOMAIN_LABELS[sector.domain] ?? sector.domain}</span>
                  </div>
                  <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold tabular-nums">
                    {sector.articleCount}
                  </span>
                </div>

                {/* Top headlines */}
                <div className="mt-3 space-y-1.5">
                  {sector.topHeadlines.map((article, i) => (
                    <div key={article.id} className="flex items-start gap-2">
                      <span className="mt-0.5 text-[10px] font-bold opacity-40">{i + 1}</span>
                      <p className="line-clamp-2 text-[13px] font-medium leading-snug opacity-90">
                        {article.headline}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Trending tag */}
                {sector.topTag ? (
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50">
                      trending
                    </span>
                    <span className="rounded bg-white/50 px-1.5 py-0.5 text-[11px] font-semibold">
                      #{sector.topTag}
                    </span>
                  </div>
                ) : null}

                {/* Click hint */}
                <div className="mt-2 text-[11px] font-medium opacity-0 transition group-hover:opacity-50">
                  Click to view all {DOMAIN_LABELS[sector.domain] ?? sector.domain} headlines →
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {/* ── HEADLINES VIEW ──────────────────────────────────── */}
        {mode === "headlines" ? (
          <section className="surface-card divide-y divide-slate-100 p-0">
            {visibleHeadlines.map((article) => {
              const feedback = feedbackMap[article.id];
              const isSelected = selectedRecallIds.has(article.id);
              return (
                <div
                  key={article.id}
                  className={`group flex items-center gap-3 px-4 py-2 hover:bg-slate-50 ${
                    isSelected ? "bg-sky-50/60" : ""
                  }`}
                >
                  {/* Recall select */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRecallSelect(article.id)}
                    aria-label={`Select article: ${article.headline}`}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-sky-600"
                  />

                  {/* Domain badge */}
                  <span
                    className={`hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold sm:inline-block ${
                      DOMAIN_BADGE[article.domain] ?? DOMAIN_BADGE.General
                    }`}
                  >
                    {DOMAIN_LABELS[article.domain] ?? article.domain}
                  </span>

                  {/* Source */}
                  <span className="hidden w-28 shrink-0 truncate text-xs text-slate-400 lg:block">
                    {article.source}
                  </span>

                  {/* Headline — click to open */}
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-800 hover:text-sky-700 hover:underline"
                    title={article.headline}
                  >
                    {article.headline}
                  </a>

                  {/* Time */}
                  <span className="hidden shrink-0 text-[11px] tabular-nums text-slate-400 sm:block">
                    {timeAgo(article.date)}
                  </span>

                  {/* Compact importance: just the number, click to edit */}
                  <div className="shrink-0">
                    <ImportanceEditor
                      article={article}
                      feedback={feedback}
                      learnedAdjustment={
                        learningProfile
                          ? getLearnedAdjustment(article, learningProfile)
                          : 0
                      }
                      onSetImportance={handleImportanceChange}
                      onResetImportance={handleImportanceReset}
                    />
                  </div>
                </div>
              );
            })}

            {headlineCount < sortedArticles.length ? (
              <div className="flex items-center justify-center gap-4 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setHeadlineCount((n) => n + HEADLINES_PAGE)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-sky-300 hover:text-sky-700"
                >
                  Show {Math.min(HEADLINES_PAGE, sortedArticles.length - headlineCount)} more
                </button>
                <button
                  type="button"
                  onClick={() => setHeadlineCount(sortedArticles.length)}
                  className="text-sm font-medium text-slate-500 hover:text-sky-700"
                >
                  All ({sortedArticles.length - headlineCount} left)
                </button>
              </div>
            ) : null}

            {!sortedArticles.length ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                No articles yet. Run a refresh to pull from feeds.
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
      {recallNotice ? (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg"
        >
          {recallNotice}
          <button
            type="button"
            onClick={() => setRecallNotice(null)}
            className="ml-3 text-xs font-medium text-sky-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      <RecallActionBar
        selectedCount={selectedRecallIds.size}
        onClear={clearRecallSelect}
        onSend={handleSendToRecall}
      />
    </AppShell>
  );
}
