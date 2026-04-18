"use client";

import Link from "next/link";
import { useState } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { Tag } from "@/components/Tag";
import { articles, categoryGroups } from "@/lib/data";

export default function DashboardPage() {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = Array.from(
    new Set(articles.flatMap((article) => article.tags)),
  ).sort();

  const filteredArticles = activeTag
    ? articles.filter((article) => article.tags.includes(activeTag))
    : articles;

  const topSignals = [...filteredArticles]
    .sort((left, right) => right.importance - left.importance)
    .slice(0, 5);

  const toggleTag = (tag: string) => {
    setActiveTag((current) => (current === tag ? null : tag));
  };

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
                Fast readout on AI infrastructure, semis, power, and frontier
                systems.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                A compact view of the highest-signal stories, grouped by theme
                and filterable by tag.
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Tag Filter</h2>
            <p className="mt-1 text-sm text-slate-600">
              {activeTag
                ? `Showing articles tagged #${activeTag}.`
                : "Select a tag to narrow the dashboard."}
            </p>
          </div>
          {activeTag ? (
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="text-sm font-medium text-accent"
            >
              Clear filter
            </button>
          ) : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <Tag
              key={tag}
              label={tag}
              active={activeTag === tag}
              onClick={toggleTag}
            />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-ink">Top Signals</h2>
          <span className="text-sm text-slate-500">Top 5 by importance</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {topSignals.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              activeTag={activeTag}
              onTagClick={toggleTag}
            />
          ))}
        </div>
      </section>

      <section className="mt-10 space-y-8">
        {categoryGroups.map((group) => {
          const groupArticles = filteredArticles.filter((article) =>
            group.domains.some((domain) => domain === article.domain),
          );

          return (
            <section key={group.title}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-ink">{group.title}</h2>
                <span className="text-sm text-slate-500">
                  {groupArticles.length} signals
                </span>
              </div>
              {groupArticles.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {groupArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      activeTag={activeTag}
                      onTagClick={toggleTag}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-line bg-white/70 p-6 text-sm text-slate-500">
                  No articles match this filter.
                </div>
              )}
            </section>
          );
        })}
      </section>
    </main>
  );
}
