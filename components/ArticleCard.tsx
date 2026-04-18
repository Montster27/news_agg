"use client";

import { useState } from "react";
import { Article } from "@/lib/types";
import { Tag } from "@/components/Tag";

type ArticleCardProps = {
  article: Article;
  isHighlighted?: boolean;
  activeTags?: string[];
  onTagClick?: (tag: string) => void;
};

export function ArticleCard({
  article,
  isHighlighted = false,
  activeTags = [],
  onTagClick,
}: ArticleCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-panel ${
        isHighlighted ? "border-accent/40" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            <span>{article.domain}</span>
            {article.source ? <span>{article.source}</span> : null}
            <span>{article.date}</span>
          </div>
          <h3 className="text-lg font-semibold text-ink">{article.headline}</h3>
        </div>
        {article.importance ? (
          <div className="rounded-full bg-mist px-3 py-1 text-sm font-semibold text-accent">
            {article.importance}/5
          </div>
        ) : null}
      </div>

      {article.tags?.length ? (
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
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="mt-4 text-sm font-medium text-accent"
      >
        {expanded ? "Hide summary" : "Show summary"}
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-6 text-slate-600">{article.summary}</p>
          {article.url ? (
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm font-medium text-accent hover:underline"
            >
              Open article
            </a>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
