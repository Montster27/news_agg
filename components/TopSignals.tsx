"use client";

import { Article } from "@/lib/types";
import { Tag } from "@/components/Tag";

type TopSignalsProps = {
  articles: Article[];
  activeTags: string[];
  personalizedView: boolean;
  scoreLookup?: Map<string, number>;
  onTagClick: (tag: string) => void;
};

export function TopSignals({
  articles,
  activeTags,
  personalizedView,
  scoreLookup,
  onTagClick,
}: TopSignalsProps) {
  return (
    <section className="surface-card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="section-kicker">What Matters Today</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Top Signals</h2>
        </div>
        <span className="text-sm text-slate-500">
          {personalizedView ? "Top 5 by personal score" : "Top 5 by importance"}
        </span>
      </div>

      {articles.length ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {articles.map((article) => (
            <article
              key={article.id}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                      {article.domain}
                    </span>
                    {article.source ? <span>{article.source}</span> : null}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold leading-7 text-slate-900">
                    {article.headline}
                  </h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  {personalizedView
                    ? `${(scoreLookup?.get(article.id) ?? article.importance).toFixed(1)}`
                    : `${article.importance}/5`}
                </span>
              </div>
              <p className="mt-3 truncate text-sm text-slate-600">{article.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Tag
                    key={tag}
                    label={tag}
                    active={activeTags.includes(tag)}
                    onClick={onTagClick}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="surface-muted mt-6 border-dashed text-sm text-slate-500">
          No signals yet — try adjusting filters.
        </div>
      )}
    </section>
  );
}
