"use client";

import { useState } from "react";
import { ImportanceEditor } from "@/components/ImportanceEditor";
import { Tag } from "@/components/Tag";
import { Article, ImportanceFeedback, StoryCluster } from "@/lib/types";

type ArticleCardProps = {
  article?: Article;
  cluster?: StoryCluster;
  isHighlighted?: boolean;
  activeTags?: string[];
  feedback?: ImportanceFeedback;
  onTagClick?: (tag: string) => void;
  onImportanceChange?: (
    article: Article,
    userImportance: 1 | 2 | 3 | 4 | 5,
  ) => void;
  onImportanceReset?: (article: Article) => void;
};

export function ArticleCard({
  article,
  cluster,
  isHighlighted = false,
  activeTags = [],
  feedback,
  onTagClick,
  onImportanceChange,
  onImportanceReset,
}: ArticleCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (cluster) {
    const bullets = cluster.whyItMatters.slice(0, 3);
    const visibleEntities = cluster.entities
      .filter((entity) => entity.type !== "other")
      .slice(0, 4);

    return (
      <article
        className={`rounded-2xl border bg-white p-5 shadow-panel ${
          isHighlighted ? "border-accent/40" : "border-line"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              <span>{cluster.domain}</span>
              <span>{cluster.sourceCount} sources</span>
              <span>{cluster.confidence} confidence</span>
            </div>
            <h3 className="text-lg font-semibold text-ink">{cluster.headline}</h3>
          </div>
          <div className="rounded-xl border border-line bg-mist px-3 py-2 text-right">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Impact</div>
            <div className="text-xl font-semibold text-ink">{cluster.impactScore.toFixed(1)}</div>
          </div>
        </div>

        {cluster.tags?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {cluster.tags.map((tag) => (
              <Tag
                key={tag}
                label={tag}
                active={activeTags.includes(tag)}
                onClick={onTagClick}
              />
            ))}
          </div>
        ) : null}

        {visibleEntities.length ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            {visibleEntities.map((entity) => (
              <span key={entity.normalized} className="rounded-full bg-mist px-2 py-1">
                {entity.name}
              </span>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-4 text-sm font-medium text-accent"
        >
          {expanded ? "Hide synthesis" : "Show why it matters"}
        </button>

        {expanded ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm leading-6 text-slate-600">{cluster.summary}</p>
            <ul className="space-y-1 text-sm leading-6 text-slate-600">
              {bullets.map((bullet) => (
                <li key={bullet}>- {bullet}</li>
              ))}
            </ul>
            <div className="text-xs text-slate-500">
              Raw articles: {cluster.articleIds.length}
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  if (!article) {
    return null;
  }

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
        <ImportanceEditor
          article={article}
          feedback={feedback}
          onSetImportance={onImportanceChange}
          onResetImportance={onImportanceReset}
        />
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
