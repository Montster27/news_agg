"use client";

type Insight = {
  title: string;
  explanation: string;
  confidence: "low" | "medium" | "high";
};

type KeyInsightsProps = {
  insights: Insight[];
  activeTags: string[];
  onInsightClick: (text: string) => void;
};

export function KeyInsights({
  insights,
  activeTags,
  onInsightClick,
}: KeyInsightsProps) {
  return (
    <section className="surface-card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="section-kicker">Structural Read</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Key Insights</h2>
        </div>
        {activeTags.length ? (
          <span className="text-sm text-sky-700">Filtered by {activeTags.join(", ")}</span>
        ) : (
          <span className="text-sm text-slate-500">Top 3-5 items</span>
        )}
      </div>

      {insights.length ? (
        <div className="mt-4 space-y-3">
          {insights.map((insight) => (
            <button
              key={insight.title}
              type="button"
              onClick={() => onInsightClick(`${insight.title} ${insight.explanation}`)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-semibold text-slate-900">{insight.title}</h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm">
                  {insight.confidence}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{insight.explanation}</p>
            </button>
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
