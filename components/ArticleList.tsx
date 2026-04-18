"use client";

import { Article } from "@/lib/types";
import { Tag } from "@/components/Tag";

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
    <section className="surface-card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="section-kicker">Drill-Down Articles</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Articles</h2>
        </div>
        <span className="text-sm text-slate-500">{articles.length} visible</span>
      </div>

      {articles.length ? (
        <div className="mt-4 space-y-3">
          {articles.map((article) => (
            <article
              key={article.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                      {article.domain}
                    </span>
                    {article.source ? <span>{article.source}</span> : null}
                    <span>{article.date}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">{article.headline}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{article.summary}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  {personalizedView
                    ? `${(scoreLookup?.get(article.id) ?? article.importance).toFixed(1)}`
                    : `${article.importance}/5`}
                </span>
              </div>
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
              {article.url ? (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm font-medium text-sky-700 hover:underline"
                >
                  Open article
                </a>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="surface-muted mt-4 border-dashed text-sm text-slate-500">
          No signals yet — try adjusting filters.
        </div>
      )}
    </section>
  );
}
