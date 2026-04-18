"use client";

import { Article } from "@/lib/types";

type TopSignalsProps = {
  articles: Article[];
  activeTags: string[];
  onTagClick: (tag: string) => void;
};

export function TopSignals({ articles, activeTags, onTagClick }: TopSignalsProps) {
  return (
    <section className="rounded-[2rem] border border-line bg-white p-6 shadow-panel">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Today
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Top Signals</h2>
        </div>
        <span className="text-sm text-slate-500">Top 5 by importance</span>
      </div>

      {articles.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {articles.map((article) => (
            <article
              key={article.id}
              className="rounded-2xl border border-line bg-mist px-5 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                    <span>{article.domain}</span>
                    {article.source ? <span>{article.source}</span> : null}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-ink">{article.headline}</h3>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-accent">
                  {article.importance}/5
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{article.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onTagClick(tag)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      activeTags.includes(tag)
                        ? "border-accent bg-accent text-white"
                        : "border-line bg-white text-slate-600 hover:border-accent hover:text-accent"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-mist px-5 py-6 text-sm text-slate-500">
          No high-priority articles match the current filters.
        </div>
      )}
    </section>
  );
}
