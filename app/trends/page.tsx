import Link from "next/link";
import { analyzeLongTermTrends, hasDatabase } from "@/lib/db";
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
          className="w-5 rounded-t bg-accent/70"
          style={{ height: `${Math.max((point.count / max) * 56, 6)}px` }}
          title={`${point.week}: ${point.count}`}
        />
      ))}
    </div>
  );
}

function TrendSection({
  title,
  items,
  tone,
}: {
  title: string;
  items: Array<{
    tag: string;
    points: Array<{ week: string; count: number }>;
    delta: number;
    average: number;
  }>;
  tone: "up" | "down" | "stable";
}) {
  const toneClass =
    tone === "up"
      ? "text-emerald-700"
      : tone === "down"
        ? "text-rose-700"
        : "text-slate-600";

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold text-ink">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.tag}
            className="rounded-2xl border border-line bg-white px-5 py-4 shadow-panel"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-ink">#{item.tag}</span>
              <span className={`text-sm font-semibold ${toneClass}`}>
                {item.delta > 0 ? `+${item.delta}` : item.delta}
              </span>
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
              Avg {item.average.toFixed(1)} mentions
            </p>
            <Sparkline points={item.points} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams?: Promise<{ domain?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedDomain = domains.includes(
    (resolvedSearchParams?.domain as ArticleDomain | "All") ?? "All",
  )
    ? ((resolvedSearchParams?.domain as ArticleDomain | "All") ?? "All")
    : "All";
  const trendData = await analyzeLongTermTrends(selectedDomain);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="rounded-[2rem] border border-line bg-white p-8 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
              Long-Term Trends
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">
              Historical shifts across weeks of stored pattern snapshots
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/patterns"
              className="inline-flex items-center justify-center rounded-full border border-line bg-mist px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
            >
              Weekly Patterns
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-line bg-mist p-5">
          <div className="flex flex-wrap items-center gap-2">
            {domains.map((domain) => (
              <Link
                key={domain}
                href={domain === "All" ? "/trends" : `/trends?domain=${domain}`}
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
          {!hasDatabase() ? (
            <p className="mt-3 text-sm text-amber-800">
              `POSTGRES_URL` is not configured locally, so persistent historical trends are not
              available yet.
            </p>
          ) : null}
        </section>

        {trendData.available ? (
          <>
            <TrendSection title="Rising Trends" items={trendData.rising} tone="up" />
            <TrendSection title="Declining Trends" items={trendData.declining} tone="down" />
            <TrendSection title="Stable Core Themes" items={trendData.stable} tone="stable" />
          </>
        ) : (
          <section className="mt-10 rounded-2xl border border-line bg-white px-5 py-6 text-sm text-slate-500">
            Historical trend data will appear here after `POSTGRES_URL` is configured and weekly
            pattern snapshots begin accumulating.
          </section>
        )}
      </div>
    </main>
  );
}
