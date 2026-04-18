"use client";

import { ArticleDomain } from "@/lib/types";
import { UserProfile } from "@/lib/user";

type FiltersBarProps = {
  timeRange: "today" | "week" | "month";
  activeDomain: "All" | ArticleDomain;
  activeTags: string[];
  availableTags: string[];
  personalizedView: boolean;
  profile: UserProfile;
  onTimeRangeChange: (value: "today" | "week" | "month") => void;
  onDomainChange: (value: "All" | ArticleDomain) => void;
  onTagToggle: (tag: string) => void;
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
  personalizedView,
  profile,
  onTimeRangeChange,
  onDomainChange,
  onTagToggle,
  onClearTags,
  onPersonalizedViewChange,
  onPreferredDomainToggle,
  onPreferredTagToggle,
  onExcludedTagToggle,
}: FiltersBarProps) {
  return (
    <section className="rounded-[2rem] border border-line bg-white/90 p-6 shadow-panel">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            View Mode
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Turn personalization on to rank content by your interests.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onPersonalizedViewChange(!personalizedView)}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            personalizedView
              ? "border-accent bg-accent text-white"
              : "border-line bg-mist text-slate-600 hover:border-accent hover:text-accent"
          }`}
        >
          {personalizedView ? "Personalized View On" : "Personalized View Off"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[auto_auto_1fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Time
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {timeRanges.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onTimeRangeChange(option.value)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  timeRange === option.value
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-mist text-slate-600 hover:border-accent hover:text-accent"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Domain
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {domains.map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => onDomainChange(domain)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeDomain === domain
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-mist text-slate-600 hover:border-accent hover:text-accent"
                }`}
              >
                {domain}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Tags
            </p>
            {activeTags.length ? (
              <button
                type="button"
                onClick={onClearTags}
                className="text-sm font-medium text-accent"
              >
                Clear tags
              </button>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableTags.length ? (
              availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagToggle(tag)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    activeTags.includes(tag)
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-white text-slate-600 hover:border-accent hover:text-accent"
                  }`}
                >
                  #{tag}
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500">No tags available for the current dataset.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 border-t border-line pt-6 lg:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Preferred Domains
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {domains
              .filter((domain): domain is ArticleDomain => domain !== "All")
              .map((domain) => (
                <button
                  key={`preferred-${domain}`}
                  type="button"
                  onClick={() => onPreferredDomainToggle(domain)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    profile.preferred_domains.includes(domain)
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-white text-slate-600 hover:border-accent hover:text-accent"
                  }`}
                >
                  {domain}
                </button>
              ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Preferred Tags
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableTags.slice(0, 20).map((tag) => (
              <button
                key={`preferred-tag-${tag}`}
                type="button"
                onClick={() => onPreferredTagToggle(tag)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  profile.preferred_tags.includes(tag)
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-white text-slate-600 hover:border-accent hover:text-accent"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Excluded Tags
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableTags.slice(0, 20).map((tag) => (
              <button
                key={`excluded-tag-${tag}`}
                type="button"
                onClick={() => onExcludedTagToggle(tag)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  profile.excluded_tags.includes(tag)
                    ? "border-rose-500 bg-rose-500 text-white"
                    : "border-line bg-white text-slate-600 hover:border-rose-500 hover:text-rose-600"
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
