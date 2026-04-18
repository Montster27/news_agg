import Link from "next/link";
import { ingestFeeds } from "@/lib/ingest";
import { analyzePatterns } from "@/lib/patterns";
import { ArticleDomain } from "@/lib/types";

export const dynamic = "force-dynamic";

const domains: Array<ArticleDomain | "All"> = [
  "All",
  "AI",
  "Chips",
  "Infra",
  "Bio",
  "Energy",
  "Macro",
];

function deltaColor(delta: number) {
  if (delta > 0) {
    return "text-emerald-700";
  }

  if (delta < 0) {
    return "text-rose-700";
  }

  return "text-slate-500";
}

function deltaLabel(delta: number) {
  if (delta > 0) {
    return `+${delta}`;
  }

  return `${delta}`;
}

export default async function PatternsPage({
  searchParams,
}: {
  searchParams?: Promise<{ domain?: string }>;
}) {
  const { articles } = await ingestFeeds();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedDomain = domains.includes(
    (resolvedSearchParams?.domain as ArticleDomain | "All") ?? "All",
  )
    ? ((resolvedSearchParams?.domain as ArticleDomain | "All") ?? "All")
    : "All";
  const analysis = analyzePatterns(articles, selectedDomain);
  const maxTagCount = analysis.topTags[0]?.count ?? 1;
  const maxCorrelationCount = analysis.correlations[0]?.count ?? 1;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="rounded-[2rem] border border-line bg-white p-8 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
              Pattern View
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">
              Weekly pattern signals across tagged tech coverage
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-line bg-mist px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/brief"
            className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
          >
            Weekly Brief
          </Link>
        </div>

        <section className="mt-8 rounded-2xl border border-line bg-mist p-5">
          <div className="flex flex-wrap items-center gap-2">
            {domains.map((domain) => (
              <Link
                key={domain}
                href={domain === "All" ? "/patterns" : `/patterns?domain=${domain}`}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  selectedDomain === domain
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-white text-slate-600 hover:border-accent hover:text-accent"
                }`}
              >
                {domain}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Updated {new Date(analysis.generatedAt).toLocaleString()} for{" "}
            {selectedDomain === "All" ? "all domains" : selectedDomain}.
          </p>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-ink">Top Tags This Week</h2>
            <span className="text-sm text-slate-500">Last 7 days</span>
          </div>
          <div className="mt-4 space-y-3">
            {analysis.topTags.map((entry) => (
              <div
                key={entry.tag}
                className="rounded-2xl border border-line bg-mist px-5 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-ink">#{entry.tag}</span>
                  <span className="text-sm text-slate-500">{entry.count} mentions</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${(entry.count / maxTagCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-ink">Trending Up</h2>
            <span className="text-sm text-slate-500">Current vs previous week</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {analysis.trendingUp.map((entry) => (
              <div
                key={entry.tag}
                className="flex items-center justify-between rounded-2xl border border-line bg-white px-5 py-4"
              >
                <div>
                  <div className="font-medium text-ink">#{entry.tag}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {entry.signal}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${deltaColor(entry.delta)}`}>
                    {deltaLabel(entry.delta)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {entry.current} vs {entry.previous}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-ink">Correlations</h2>
          <div className="mt-4 space-y-3">
            {analysis.correlations.map((entry) => (
              <div
                key={entry.pair.join("-")}
                className="rounded-2xl border border-line bg-white px-5 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-ink">
                    #{entry.pair[0]} + #{entry.pair[1]}
                  </span>
                  <span className="text-sm text-slate-500">{entry.count} pairings</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-mist">
                  <div
                    className="h-2 rounded-full bg-warm"
                    style={{ width: `${(entry.count / maxCorrelationCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-ink">Insights</h2>
          <div className="mt-4 space-y-3">
            {analysis.insights.map((insight) => (
              <p
                key={insight}
                className="rounded-2xl border border-line bg-white px-5 py-4 text-sm leading-6 text-slate-600"
              >
                {insight}
              </p>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
