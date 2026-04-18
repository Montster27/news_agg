"use client";

import { Article } from "@/lib/types";

type ArticleListProps = {
  articles: Article[];
  activeTags: string[];
  personalizedView: boolean;
  scoreLookup?: Map<string, number>;
  onTagClick: (tag: string) => void;
};

export function ArticleList({
  articles,
  activeTags,
  personalizedView,
  scoreLookup,
  onTagClick,
}: ArticleListProps) {
  return (
    <section className="rounded-[2rem] border border-line bg-white p-6 shadow-panel">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Drill Down
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Articles</h2>
        </div>
        <span className="text-sm text-slate-500">{articles.length} visible</span>
      </div>

      {articles.length ? (
        <div className="space-y-3">
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
                    <span>{article.date}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-ink">{article.headline}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{article.summary}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-accent">
                  {personalizedView
                    ? `${(scoreLookup?.get(article.id) ?? article.importance).toFixed(1)}`
                    : `${article.importance}/5`}
                </span>
              </div>
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
              {article.url ? (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm font-medium text-accent hover:underline"
                >
                  Open article
                </a>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-mist px-5 py-6 text-sm text-slate-500">
          No articles match the current filters. Broaden the time range, domain, or tag set.
        </div>
      )}
    </section>
  );
}
