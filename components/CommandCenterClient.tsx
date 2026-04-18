"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ArticleDomain } from "@/lib/types";
import { FiltersBar } from "@/components/FiltersBar";
import { TopSignals } from "@/components/TopSignals";
import type { Article } from "@/lib/types";
import type { WeeklyBrief } from "@/lib/brief";
import type { PatternAnalysis } from "@/lib/patterns";
import type { LongTermTrendAnalysis } from "@/lib/db";
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
);
const TrendsPanel = dynamic(
  () => import("@/components/TrendsPanel").then((mod) => mod.TrendsPanel),
);
const ArticleList = dynamic(
  () => import("@/components/ArticleList").then((mod) => mod.ArticleList),
);

type CommandCenterClientProps = {
  articles: Article[];
  brief: WeeklyBrief;
  patterns: PatternAnalysis;
  longTermTrends: LongTermTrendAnalysis;
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
  articles,
  brief,
  patterns,
  longTermTrends,
  fetchedAt,
}: CommandCenterClientProps) {
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("week");
  const [activeDomain, setActiveDomain] = useState<"All" | ArticleDomain>("All");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [personalizedView, setPersonalizedView] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(defaultUserProfile);

  useEffect(() => {
    setProfile(loadUserProfile());
  }, []);

  useEffect(() => {
    saveUserProfile(profile);
  }, [profile]);

  const availableTags = useMemo(
    () => Array.from(new Set(articles.flatMap((article) => article.tags))).sort(),
    [articles],
  );

  const scoreLookup = useMemo(() => {
    return new Map(
      articles.map((article) => [article.id, scoreArticle(article, profile)]),
    );
  }, [articles, profile]);

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
          : right.importance;
        const leftScore = personalizedView
          ? (scoreLookup.get(left.id) ?? left.importance)
          : left.importance;

        return rightScore - leftScore ||
          right.importance - left.importance ||
          new Date(right.date).getTime() - new Date(left.date).getTime();
      })
      .slice(0, 5);
  }, [filteredArticles, personalizedView, scoreLookup]);

  const sortedArticles = useMemo(() => {
    return [...filteredArticles].sort((left, right) => {
      const rightScore = personalizedView
        ? (scoreLookup.get(right.id) ?? right.importance)
        : right.importance;
      const leftScore = personalizedView
        ? (scoreLookup.get(left.id) ?? left.importance)
        : left.importance;

      return rightScore - leftScore ||
          new Date(right.date).getTime() - new Date(left.date).getTime();
    });
  }, [filteredArticles, personalizedView, scoreLookup]);

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

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="rounded-[2rem] border border-line bg-white/90 p-8 shadow-panel backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
              Command Center
            </p>
            <div className="space-y-3">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-ink">
                One place to see what matters now, what changed this week, and where signals are moving.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600">
                Built for fast daily scanning: top articles, weekly shifts, emerging trend tags,
                long-term direction, and filtered drill-down articles.
              </p>
            </div>
          </div>
          <div className="text-sm text-slate-500">
            Last refresh {new Date(fetchedAt).toLocaleString()}
          </div>
        </div>
      </header>

      <div className="mt-8">
        <FiltersBar
          timeRange={timeRange}
          activeDomain={activeDomain}
          activeTags={activeTags}
          availableTags={availableTags}
          personalizedView={personalizedView}
          profile={profile}
          onTimeRangeChange={setTimeRange}
          onDomainChange={setActiveDomain}
          onTagToggle={toggleTag}
          onClearTags={() => setActiveTags([])}
          onPersonalizedViewChange={setPersonalizedView}
          onPreferredDomainToggle={togglePreferredDomain}
          onPreferredTagToggle={togglePreferredTag}
          onExcludedTagToggle={toggleExcludedTag}
        />
      </div>

      <div className="mt-8">
        <TopSignals
          articles={topSignals}
          activeTags={activeTags}
          personalizedView={personalizedView}
          scoreLookup={scoreLookup}
          onTagClick={toggleTag}
        />
      </div>

      <div className="mt-8">
        <WeeklyShifts
          items={orderedWeeklyShifts}
          activeTag={activeTags[0] ?? null}
          onShiftClick={handleShiftClick}
        />
      </div>

      <div className="mt-8">
        <TrendsPanel
          emerging={filteredPatterns}
          longTerm={filteredLongTerm}
          activeTags={activeTags}
          personalizedView={personalizedView}
          onTrendClick={setSingleTag}
        />
      </div>

      <div className="mt-8">
        <ArticleList
          articles={sortedArticles}
          activeTags={activeTags}
          personalizedView={personalizedView}
          scoreLookup={scoreLookup}
          onTagClick={toggleTag}
        />
      </div>
    </main>
  );
}
