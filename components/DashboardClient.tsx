"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { dashboardGroups } from "@/lib/data";
import { Article } from "@/lib/types";

type RssResponse = {
  articles: Article[];
  fetchedAt: string;
};

export function DashboardClient() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string>("");
  const [activeSource, setActiveSource] = useState<string>("All sources");
  const [activeCategory, setActiveCategory] = useState<string>("All categories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadArticles() {
      try {
        setLoading(true);
        const response = await fetch("/api/rss");

        if (!response.ok) {
          throw new Error(`RSS request failed with ${response.status}`);
        }

        const payload = (await response.json()) as RssResponse;

        if (!cancelled) {
          setArticles(payload.articles);
          setFetchedAt(payload.fetchedAt);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setArticles([]);
          setError("Unable to load RSS feeds right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadArticles();

    return () => {
      cancelled = true;
    };
  }, []);

  const sources = useMemo(
    () =>
      ["All sources", ...new Set(articles.map((article) => article.source ?? ""))].filter(
        Boolean,
      ),
    [articles],
  );

  const categories = useMemo(
    () => ["All categories", ...new Set(articles.map((article) => article.domain))],
    [articles],
  );

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const sourceMatches =
        activeSource === "All sources" || article.source === activeSource;
      const categoryMatches =
        activeCategory === "All categories" || article.domain === activeCategory;

      return sourceMatches && categoryMatches;
    });
  }, [activeCategory, activeSource, articles]);

  const latestArticles = filteredArticles.slice(0, 24);
  const topSignals = latestArticles.slice(0, 5);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="rounded-[2rem] border border-line bg-white/90 p-8 shadow-panel backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
              Daily Tech Dashboard
            </p>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink">
                Live RSS signals from curated tech, chip, infra, and macro
                sources.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Cached for ten minutes, normalized into a single article format,
                and grouped for fast scanning.
              </p>
            </div>
          </div>
          <Link
            href="/patterns"
            className="inline-flex items-center justify-center rounded-full border border-line bg-mist px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
          >
            View Patterns
          </Link>
        </div>
      </header>

      <section className="mt-8 rounded-[2rem] border border-line bg-white/80 p-6 shadow-panel">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Source</span>
            <select
              value={activeSource}
              onChange={(event) => setActiveSource(event.target.value)}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink"
            >
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Category</span>
            <select
              value={activeCategory}
              onChange={(event) => setActiveCategory(event.target.value)}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <div className="text-sm text-slate-500">
            {fetchedAt ? `Updated ${new Date(fetchedAt).toLocaleString()}` : null}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="mt-8 rounded-2xl border border-line bg-white p-6 text-sm text-slate-500 shadow-panel">
          Loading RSS feeds...
        </div>
      ) : null}

      {error ? (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-panel">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-ink">Top Signals</h2>
              <span className="text-sm text-slate-500">
                Latest {Math.min(latestArticles.length, 24)} articles
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {topSignals.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  isHighlighted={true}
                />
              ))}
            </div>
          </section>

          <section className="mt-10 space-y-8">
            {dashboardGroups.map((group) => {
              const groupArticles = latestArticles.filter((article) =>
                group.domains.some((domain) => domain === article.domain),
              );

              return (
                <section key={group.title}>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-ink">{group.title}</h2>
                    <span className="text-sm text-slate-500">
                      {groupArticles.length} articles
                    </span>
                  </div>
                  {groupArticles.length ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {groupArticles.map((article) => (
                        <ArticleCard key={article.id} article={article} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-line bg-white/70 p-6 text-sm text-slate-500">
                      No articles match the current filters.
                    </div>
                  )}
                </section>
              );
            })}
          </section>
        </>
      ) : null}
    </main>
  );
}
