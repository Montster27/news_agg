"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearImportanceFeedback,
  clearLearningProfile,
  getEffectiveImportance,
  loadImportanceFeedback,
  loadLearningProfile,
  rebuildLearningProfile,
  resetUserImportance,
  saveLearningProfile,
  setUserImportance,
  type ImportanceLearningProfile,
} from "@/lib/feedback";
import { ArticleDomain, ImportanceFeedback } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { DesktopControls } from "@/components/DesktopControls";
import { FiltersBar } from "@/components/FiltersBar";
import { SearchCommandPanel } from "@/components/SearchCommandPanel";
import { TopSignals } from "@/components/TopSignals";
import type { Article } from "@/lib/types";
import type { WeeklyBrief } from "@/lib/brief";
import type { PatternAnalysis } from "@/lib/patterns";
import type { LongTermTrendAnalysis } from "@/lib/db";
import type { InsightEngineResult } from "@/lib/insights";
import {
  articleHasExcludedTag,
  defaultUserProfile,
  loadUserProfile,
  saveUserProfile,
  scoreArticle,
  type UserProfile,
} from "@/lib/user";

const WeeklyShifts = dynamic(
  () => import("@/components/WeeklyShifts").then((mod) => mod.WeeklyShifts),
  {
    loading: () => <div className="surface-card h-56 animate-pulse bg-slate-100 p-6" />,
  },
);
const KeyInsights = dynamic(
  () => import("@/components/KeyInsights").then((mod) => mod.KeyInsights),
  {
    loading: () => <div className="surface-card h-56 animate-pulse bg-slate-100 p-6" />,
  },
);
const TrendsPanel = dynamic(
  () => import("@/components/TrendsPanel").then((mod) => mod.TrendsPanel),
  {
    loading: () => <div className="surface-card h-80 animate-pulse bg-slate-100 p-6" />,
  },
);
const ArticleList = dynamic(
  () => import("@/components/ArticleList").then((mod) => mod.ArticleList),
  {
    loading: () => <div className="surface-card h-96 animate-pulse bg-slate-100 p-6" />,
  },
);

type CommandCenterClientProps = {
  articles: Article[];
  brief: WeeklyBrief;
  patterns: PatternAnalysis;
  longTermTrends: LongTermTrendAnalysis;
  insightReport: InsightEngineResult;
  fetchedAt: string;
};

function inferRelatedTag(text: string, tags: string[]) {
  const normalized = text.toLowerCase();
  return (
    tags.find((tag) => normalized.includes(tag.replaceAll("_", " "))) ??
    tags.find((tag) => normalized.includes(tag))
  );
}

function withinRange(article: Article, range: "today" | "week" | "month") {
  const age = Date.now() - new Date(article.date).getTime();

  if (range === "today") {
    return age <= 24 * 60 * 60 * 1000;
  }

  if (range === "week") {
    return age <= 7 * 24 * 60 * 60 * 1000;
  }

  return age <= 30 * 24 * 60 * 60 * 1000;
}

export function CommandCenterClient({
  articles: initialArticles,
  brief: initialBrief,
  patterns: initialPatterns,
  longTermTrends: initialLongTermTrends,
  insightReport: initialInsightReport,
  fetchedAt: initialFetchedAt,
}: CommandCenterClientProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [brief, setBrief] = useState(initialBrief);
  const [patterns, setPatterns] = useState(initialPatterns);
  const [longTermTrends, setLongTermTrends] = useState(initialLongTermTrends);
  const [insightReport, setInsightReport] = useState(initialInsightReport);
  const [fetchedAt, setFetchedAt] = useState(initialFetchedAt);
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("week");
  const [activeDomain, setActiveDomain] = useState<"All" | ArticleDomain>("All");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState("");
  const [personalizedView, setPersonalizedView] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(defaultUserProfile);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, ImportanceFeedback>>({});
  const [learningProfile, setLearningProfile] =
    useState<ImportanceLearningProfile>(loadLearningProfile);

  const loadDesktopData = useCallback(async () => {
    if (!window.desktop) {
      return;
    }

    try {
      setRefreshStatus("Reading local cache");
      const [
        localArticles,
        localPatterns,
        localBrief,
        localInsights,
        localLongTermTrends,
        localFeedback,
        lastRefresh,
        preferences,
      ] = await Promise.all([
        window.desktop.data.getArticles({ limit: 500 }),
        window.desktop.data.getPatterns({ limit: 500 }),
        window.desktop.data.getBrief(),
        window.desktop.data.getInsights(),
        window.desktop.data.getLongTermTrends({ weeks: 12 }),
        window.desktop.data.getImportanceFeedback(),
        window.desktop.jobs.getLastRefresh(),
        window.desktop.data.getPreferences(),
      ]);

      setArticles(localArticles);
      setPatterns(localPatterns);
      if (localBrief) {
        setBrief(localBrief);
      }
      if (localInsights.insights.length) {
        setInsightReport(localInsights);
      }
      if (localLongTermTrends.available) {
        setLongTermTrends(localLongTermTrends);
      }
      setFeedbackMap(localFeedback);
      const learned = rebuildLearningProfile(localArticles, localFeedback);
      setLearningProfile(learned);
      saveLearningProfile(learned);
      setFetchedAt(lastRefresh ?? localArticles[0]?.processed_at ?? initialFetchedAt);
      setPersonalizedView(preferences.personalizedDefault);
      setRefreshStatus(
        preferences.lastRefreshError
          ? "Cached data"
          : lastRefresh
            ? "Local cache"
            : "Local cache empty",
      );
    } catch {
      setRefreshStatus("Local cache unavailable");
    }
  }, [initialFetchedAt]);

  useEffect(() => {
    if (window.desktop) {
      void window.desktop.data.getImportanceFeedback().then((storedFeedback) => {
        const learned = rebuildLearningProfile(articles, storedFeedback);
        setFeedbackMap(storedFeedback);
        setLearningProfile(learned);
        saveLearningProfile(learned);
      });
      return;
    }

    setProfile(loadUserProfile());
    const storedFeedback = loadImportanceFeedback();
    const learned = rebuildLearningProfile(articles, storedFeedback);
    setFeedbackMap(storedFeedback);
    setLearningProfile(learned);
    saveLearningProfile(learned);
  }, [articles]);

  useEffect(() => {
    void loadDesktopData();
  }, [loadDesktopData]);

  useEffect(() => {
    saveUserProfile(profile);
  }, [profile]);

  const availableTags = useMemo(
    () => Array.from(new Set(articles.flatMap((article) => article.tags))).sort(),
    [articles],
  );
  const availableDomains = useMemo(
    () => Array.from(new Set(articles.map((article) => article.domain))).sort(),
    [articles],
  );

  const scoreLookup = useMemo(() => {
    return new Map(
      articles.map((article) => [
        article.id,
        scoreArticle(article, profile, feedbackMap, learningProfile),
      ]),
    );
  }, [articles, feedbackMap, learningProfile, profile]);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesTime = withinRange(article, timeRange);
      const matchesDomain = activeDomain === "All" || article.domain === activeDomain;
      const matchesTags =
        activeTags.length === 0 ||
        activeTags.every((tag) => article.tags.includes(tag));

      const excluded =
        personalizedView && articleHasExcludedTag(article, profile);

      return matchesTime && matchesDomain && matchesTags && !excluded;
    });
  }, [activeDomain, activeTags, articles, personalizedView, profile, timeRange]);

  const filteredPatterns = useMemo(() => {
    const tagsToUse = activeTags.length
      ? patterns.trendingUp.filter((entry) => activeTags.includes(entry.tag))
      : patterns.trendingUp;

    const prioritized = personalizedView
      ? [...tagsToUse].sort((left, right) => {
          const leftBoost = profile.preferred_tags.includes(left.tag) ? 1 : 0;
          const rightBoost = profile.preferred_tags.includes(right.tag) ? 1 : 0;
          return rightBoost - leftBoost || right.delta - left.delta;
        })
      : tagsToUse;

    return prioritized.slice(0, 6);
  }, [activeTags, patterns.trendingUp, personalizedView, profile.preferred_tags]);

  const filteredLongTerm = useMemo(() => {
    const rising = activeTags.length
      ? longTermTrends.rising.filter((entry) => activeTags.includes(entry.tag))
      : longTermTrends.rising;

    const prioritized = personalizedView
      ? [...rising].sort((left, right) => {
          const leftBoost = profile.preferred_tags.includes(left.tag) ? 1 : 0;
          const rightBoost = profile.preferred_tags.includes(right.tag) ? 1 : 0;
          return rightBoost - leftBoost || right.delta - left.delta;
        })
      : rising;

    return prioritized.slice(0, 6);
  }, [activeTags, longTermTrends.rising, personalizedView, profile.preferred_tags]);

  const topSignals = useMemo(() => {
    return [...filteredArticles]
      .sort((left, right) => {
        const rightScore = personalizedView
          ? (scoreLookup.get(right.id) ?? right.importance)
          : getEffectiveImportance(right, feedbackMap);
        const leftScore = personalizedView
          ? (scoreLookup.get(left.id) ?? left.importance)
          : getEffectiveImportance(left, feedbackMap);

        return rightScore - leftScore ||
          getEffectiveImportance(right, feedbackMap) - getEffectiveImportance(left, feedbackMap) ||
          new Date(right.date).getTime() - new Date(left.date).getTime();
      })
      .slice(0, 5);
  }, [feedbackMap, filteredArticles, personalizedView, scoreLookup]);

  const sortedArticles = useMemo(() => {
    return [...filteredArticles].sort((left, right) => {
      const rightScore = personalizedView
        ? (scoreLookup.get(right.id) ?? right.importance)
        : getEffectiveImportance(right, feedbackMap);
      const leftScore = personalizedView
        ? (scoreLookup.get(left.id) ?? left.importance)
        : getEffectiveImportance(left, feedbackMap);

      return rightScore - leftScore ||
          new Date(right.date).getTime() - new Date(left.date).getTime();
    });
  }, [feedbackMap, filteredArticles, personalizedView, scoreLookup]);

  const orderedWeeklyShifts = useMemo(() => {
    if (!personalizedView) {
      return brief.top_shifts;
    }

    return [...brief.top_shifts].sort((left, right) => {
      const leftTag = inferRelatedTag(left, profile.preferred_tags);
      const rightTag = inferRelatedTag(right, profile.preferred_tags);
      return Number(Boolean(rightTag)) - Number(Boolean(leftTag));
    });
  }, [brief.top_shifts, personalizedView, profile.preferred_tags]);

  const visibleInsights = useMemo(() => {
    if (!activeTags.length) {
      return insightReport.insights.slice(0, 5);
    }

    return insightReport.insights.filter((insight) => {
      const text = `${insight.title} ${insight.explanation}`.toLowerCase();
      return activeTags.some((tag) => {
        const readable = tag.replaceAll("_", " ");
        return text.includes(tag) || text.includes(readable);
      });
    });
  }, [activeTags, insightReport.insights]);

  const headerLabel =
    timeRange === "today" ? "Today" : timeRange === "week" ? "This Week" : "This Month";
  const activeFilterCount =
    (activeDomain === "All" ? 0 : 1) + activeTags.length + (personalizedView ? 1 : 0);
  const lastRefreshLabel = new Date(fetchedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const desktopExportPayload = useMemo(
    () => ({
      exportedAt: new Date().toISOString(),
      view: {
        timeRange,
        activeDomain,
        activeTags,
        personalizedView,
      },
      articles: sortedArticles.map((article) => ({
        id: article.id,
        headline: article.headline,
        summary: article.summary,
        domain: article.domain,
        tags: article.tags,
        importance: article.importance,
        score: scoreLookup.get(article.id) ?? article.importance,
        source: article.source,
        url: article.url,
        date: article.date,
      })),
      feedback: feedbackMap,
      learning: learningProfile,
    }),
    [
      activeDomain,
      activeTags,
      feedbackMap,
      learningProfile,
      personalizedView,
      scoreLookup,
      sortedArticles,
      timeRange,
    ],
  );

  const setSingleTag = (tag: string) => {
    setActiveTags((current) =>
      current.includes(tag) ? current : [...current, tag],
    );
  };

  const toggleTag = (tag: string) => {
    setActiveTags((current) =>
      current.includes(tag)
        ? current.filter((value) => value !== tag)
        : [...current, tag],
    );
  };

  const handleShiftClick = (text: string) => {
    const related = inferRelatedTag(text, availableTags) ??
      inferRelatedTag(text, profile.preferred_tags);
    if (related) {
      setSingleTag(related);
    }
  };

  const togglePreferredDomain = (domain: ArticleDomain) => {
    setProfile((current) => ({
      ...current,
      preferred_domains: current.preferred_domains.includes(domain)
        ? current.preferred_domains.filter((value) => value !== domain)
        : [...current.preferred_domains, domain],
    }));
  };

  const togglePreferredTag = (tag: string) => {
    setProfile((current) => ({
      ...current,
      preferred_tags: current.preferred_tags.includes(tag)
        ? current.preferred_tags.filter((value) => value !== tag)
        : [...current.preferred_tags, tag],
    }));
  };

  const toggleExcludedTag = (tag: string) => {
    setProfile((current) => ({
      ...current,
      excluded_tags: current.excluded_tags.includes(tag)
        ? current.excluded_tags.filter((value) => value !== tag)
        : [...current.excluded_tags, tag],
    }));
  };

  const rebuildAndStoreLearning = (nextFeedback: Record<string, ImportanceFeedback>) => {
    const nextLearningProfile = rebuildLearningProfile(articles, nextFeedback);
    setLearningProfile(nextLearningProfile);
    saveLearningProfile(nextLearningProfile);
  };

  const handleImportanceChange = (
    article: Article,
    userImportance: 1 | 2 | 3 | 4 | 5,
  ) => {
    const nextFeedback = setUserImportance(
      article.id,
      article.importance,
      userImportance,
      feedbackMap,
    );
    setFeedbackMap(nextFeedback);
    rebuildAndStoreLearning(nextFeedback);
    void window.desktop?.data.saveImportanceFeedback({
      articleId: article.id,
      originalImportance: article.importance,
      userImportance,
    });
  };

  const handleImportanceReset = (article: Article) => {
    const nextFeedback = resetUserImportance(article.id, feedbackMap);
    setFeedbackMap(nextFeedback);
    rebuildAndStoreLearning(nextFeedback);
    void window.desktop?.data.saveImportanceFeedback({
      articleId: article.id,
      reset: true,
    });
  };

  const handleClearLearning = () => {
    clearImportanceFeedback();
    clearLearningProfile();
    setFeedbackMap({});
    setLearningProfile({
      domainAdjustments: {},
      tagAdjustments: {},
      sampleCount: 0,
    });
    void window.desktop?.data.clearLearningProfile();
  };

  const rightRail = articles.length ? (
    <div className="space-y-4">
      <WeeklyShifts
        items={orderedWeeklyShifts}
        activeTag={activeTags[0] ?? null}
        onShiftClick={handleShiftClick}
      />
      <KeyInsights
        insights={visibleInsights}
        activeTags={activeTags}
        onInsightClick={handleShiftClick}
      />
      <TrendsPanel
        emerging={filteredPatterns}
        longTerm={filteredLongTerm}
        activeTags={activeTags}
        personalizedView={personalizedView}
        onTrendClick={setSingleTag}
      />
    </div>
  ) : null;

  return (
    <AppShell aside={rightRail} activePath="/">
      <div className="space-y-6">
        <header className="surface-card p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="section-kicker">Tech Intelligence</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Command Center
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                High-signal articles, shifts, and trend context in one scanning view.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase text-slate-500">Window</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{headerLabel}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase text-slate-500">Articles</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {sortedArticles.length} visible
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase text-slate-500">Filters</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {activeFilterCount || "None"}
                </div>
              </div>
            </div>
          </div>

          <div className="panel-divider flex flex-col gap-3 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
            <div>
              Last refresh <span className="font-medium text-slate-700">{lastRefreshLabel}</span>
            </div>
            <DesktopControls
              exportPayload={desktopExportPayload}
              refreshStatus={refreshStatus}
              onRefreshComplete={loadDesktopData}
              onPreferencesLoaded={(preferences) => {
                setPersonalizedView(preferences.personalizedDefault);
                if (preferences.lastRefreshError) {
                  setRefreshStatus("Cached data");
                }
              }}
              onClearLearning={handleClearLearning}
            />
          </div>
        </header>

        <SearchCommandPanel
          availableDomains={availableDomains}
          availableTags={availableTags}
        />

        <FiltersBar
          timeRange={timeRange}
          activeDomain={activeDomain}
          activeTags={activeTags}
          availableTags={availableTags}
          tagQuery={tagQuery}
          personalizedView={personalizedView}
          profile={profile}
          onTimeRangeChange={setTimeRange}
          onDomainChange={setActiveDomain}
          onTagToggle={toggleTag}
          onTagQueryChange={setTagQuery}
          onClearTags={() => setActiveTags([])}
          onPersonalizedViewChange={setPersonalizedView}
          onPreferredDomainToggle={togglePreferredDomain}
          onPreferredTagToggle={togglePreferredTag}
          onExcludedTagToggle={toggleExcludedTag}
          onClearImportanceLearning={handleClearLearning}
        />

        {articles.length ? (
          <>
            <TopSignals
              articles={topSignals}
              activeTags={activeTags}
              personalizedView={personalizedView}
              scoreLookup={scoreLookup}
              feedbackMap={feedbackMap}
              learningProfile={learningProfile}
              onTagClick={toggleTag}
              onImportanceChange={handleImportanceChange}
              onImportanceReset={handleImportanceReset}
            />

            <div className="xl:hidden">
              {rightRail}
            </div>

            <ArticleList
              articles={sortedArticles}
              activeTags={activeTags}
              personalizedView={personalizedView}
              scoreLookup={scoreLookup}
              feedbackMap={feedbackMap}
              learningProfile={learningProfile}
              onTagClick={toggleTag}
              onImportanceChange={handleImportanceChange}
              onImportanceReset={handleImportanceReset}
            />
          </>
        ) : (
          <section className="surface-card p-5 sm:p-6">
            <p className="section-kicker">Local Cache</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Waiting for articles
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              No articles are available for the current data source yet. Refresh, import
              data, or check source configuration; then the signal, trend, and article
              sections will appear here.
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
