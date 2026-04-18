"use client";

import { ArticleDomain } from "@/lib/types";

type FiltersBarProps = {
  timeRange: "today" | "week" | "month";
  activeDomain: "All" | ArticleDomain;
  activeTags: string[];
  availableTags: string[];
  onTimeRangeChange: (value: "today" | "week" | "month") => void;
  onDomainChange: (value: "All" | ArticleDomain) => void;
  onTagToggle: (tag: string) => void;
  onClearTags: () => void;
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
  onTimeRangeChange,
  onDomainChange,
  onTagToggle,
  onClearTags,
}: FiltersBarProps) {
  return (
    <section className="rounded-[2rem] border border-line bg-white/90 p-6 shadow-panel">
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
    </section>
  );
}
