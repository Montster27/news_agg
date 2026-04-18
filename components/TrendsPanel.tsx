"use client";

type DeltaTrend = {
  tag: string;
  delta: number;
  current: number;
  previous: number;
  signal: string;
};

type RisingTrend = {
  tag: string;
  delta: number;
  points: Array<{ week: string; count: number }>;
};

type TrendsPanelProps = {
  emerging: DeltaTrend[];
  longTerm: RisingTrend[];
  activeTags: string[];
  personalizedView: boolean;
  onTrendClick: (tag: string) => void;
};

function Sparkline({
  points,
}: {
  points: Array<{ week: string; count: number }>;
}) {
  const max = Math.max(...points.map((point) => point.count), 1);

  return (
    <div className="mt-3 flex items-end gap-1">
      {points.map((point) => (
        <div
          key={point.week}
          className="w-4 rounded-t bg-accent/70"
          style={{ height: `${Math.max((point.count / max) * 42, 6)}px` }}
          title={`${point.week}: ${point.count}`}
        />
      ))}
    </div>
  );
}

export function TrendsPanel({
  emerging,
  longTerm,
  activeTags,
  personalizedView,
  onTrendClick,
}: TrendsPanelProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-[2rem] border border-line bg-white p-6 shadow-panel">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Near Term
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">Emerging Trends</h2>
          </div>
          <span className="text-sm text-slate-500">
            {personalizedView ? "Priority adjusted by profile" : "Highest positive delta"}
          </span>
        </div>

        {emerging.length ? (
          <div className="space-y-3">
            {emerging.map((trend) => (
              <button
                key={trend.tag}
                type="button"
                onClick={() => onTrendClick(trend.tag)}
                className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition ${
                  activeTags.includes(trend.tag)
                    ? "border-accent bg-accent/5"
                    : "border-line bg-mist hover:border-accent"
                }`}
              >
                <div>
                  <div className="font-medium text-ink">#{trend.tag}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {trend.signal}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-emerald-700">
                    +{trend.delta}
                  </div>
                  <div className="text-xs text-slate-500">
                    {trend.current} vs {trend.previous}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-mist px-5 py-6 text-sm text-slate-500">
            No emerging trends are available for the current filters.
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-line bg-white p-6 shadow-panel">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Direction
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">Long-Term Trends</h2>
          </div>
          <span className="text-sm text-slate-500">
            {personalizedView ? "Priority adjusted by profile" : "Top rising tags"}
          </span>
        </div>

        {longTerm.length ? (
          <div className="space-y-3">
            {longTerm.map((trend) => (
              <button
                key={trend.tag}
                type="button"
                onClick={() => onTrendClick(trend.tag)}
                className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                  activeTags.includes(trend.tag)
                    ? "border-accent bg-accent/5"
                    : "border-line bg-mist hover:border-accent"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-ink">#{trend.tag}</span>
                  <span className="text-sm font-semibold text-emerald-700">
                    +{trend.delta}
                  </span>
                </div>
                <Sparkline points={trend.points} />
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-mist px-5 py-6 text-sm text-slate-500">
            Long-term trend history is not available for the current filters.
          </div>
        )}
      </section>
    </div>
  );
}
