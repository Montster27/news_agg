"use client";

import { Tag } from "@/components/Tag";
import { ArticleDomain } from "@/lib/types";
import { UserProfile } from "@/lib/user";

type FiltersBarProps = {
  timeRange: "today" | "week" | "month";
  activeDomain: "All" | ArticleDomain;
  activeTags: string[];
  availableTags: string[];
  tagQuery: string;
  personalizedView: boolean;
  profile: UserProfile;
  onTimeRangeChange: (value: "today" | "week" | "month") => void;
  onDomainChange: (value: "All" | ArticleDomain) => void;
  onTagToggle: (tag: string) => void;
  onTagQueryChange: (value: string) => void;
  onClearTags: () => void;
  onPersonalizedViewChange: (value: boolean) => void;
  onPreferredDomainToggle: (domain: ArticleDomain) => void;
  onPreferredTagToggle: (tag: string) => void;
  onExcludedTagToggle: (tag: string) => void;
};

const timeRanges: Array<{ label: string; value: "today" | "week" | "month" }> = [
  { label: "Today", value: "today" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

const domains: Array<"All" | ArticleDomain> = [
  "All",
  "AI",
  "Chips",
  "Infra",
  "Bio",
  "Energy",
  "Macro",
  "General",
  "Frontier",
];

export function FiltersBar({
  timeRange,
  activeDomain,
  activeTags,
  availableTags,
  tagQuery,
  personalizedView,
  profile,
  onTimeRangeChange,
  onDomainChange,
  onTagToggle,
  onTagQueryChange,
  onClearTags,
  onPersonalizedViewChange,
  onPreferredDomainToggle,
  onPreferredTagToggle,
  onExcludedTagToggle,
}: FiltersBarProps) {
  const visibleTags = availableTags.filter((tag) =>
    tag.toLowerCase().includes(tagQuery.trim().toLowerCase()),
  );

  return (
    <section className="surface-card sticky top-4 z-20 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="section-kicker">Filters</p>
          <p className="mt-1 text-sm text-slate-500">
            Time, domain, tags, and personal ranking controls.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onPersonalizedViewChange(!personalizedView)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            personalizedView
              ? "bg-sky-600 text-white shadow-sm"
              : "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {personalizedView ? "Personalized View On" : "Personalized View Off"}
        </button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[auto_auto_minmax(0,1fr)]">
        <div>
          <p className="section-kicker">Time Range</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {timeRanges.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onTimeRangeChange(option.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  timeRange === option.value
                    ? "bg-sky-600 text-white shadow-sm"
                    : "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="section-kicker">Domain</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {domains.map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => onDomainChange(domain)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeDomain === domain
                    ? "bg-sky-600 text-white shadow-sm"
                    : "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {domain}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <p className="section-kicker">Tag Search</p>
            {activeTags.length ? (
              <button
                type="button"
                onClick={onClearTags}
                className="text-sm font-medium text-sky-700"
              >
                Clear tags
              </button>
            ) : null}
          </div>
          <div className="mt-3 space-y-3">
            <input
              value={tagQuery}
              onChange={(event) => onTagQueryChange(event.target.value)}
              placeholder="Search tags"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            {visibleTags.length ? (
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto pr-1">
                {visibleTags.map((tag) => (
                  <Tag
                    key={tag}
                    label={tag}
                    active={activeTags.includes(tag)}
                    onClick={onTagToggle}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No matching tags.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 lg:grid-cols-3">
        <div>
          <p className="section-kicker">Preferred Domains</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {domains
              .filter((domain): domain is ArticleDomain => domain !== "All")
              .map((domain) => (
                <Tag
                  key={`preferred-${domain}`}
                  label={domain}
                  active={profile.preferred_domains.includes(domain)}
                  onClick={() => onPreferredDomainToggle(domain)}
                />
              ))}
          </div>
        </div>

        <div>
          <p className="section-kicker">Preferred Tags</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableTags.slice(0, 20).map((tag) => (
              <Tag
                key={`preferred-tag-${tag}`}
                label={tag}
                active={profile.preferred_tags.includes(tag)}
                onClick={onPreferredTagToggle}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="section-kicker">Excluded Tags</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableTags.slice(0, 20).map((tag) => (
              <button
                key={`excluded-tag-${tag}`}
                type="button"
                onClick={() => onExcludedTagToggle(tag)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  profile.excluded_tags.includes(tag)
                    ? "border-rose-600 bg-rose-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-rose-400 hover:text-rose-600"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
