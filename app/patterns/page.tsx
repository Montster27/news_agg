import Link from "next/link";
import { ingestFeeds } from "@/lib/ingest";

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const { articles } = await ingestFeeds();

  const topTags = Object.entries(
    articles.reduce<Record<string, number>>((accumulator, article) => {
      for (const tag of article.tags) {
        accumulator[tag] = (accumulator[tag] ?? 0) + 1;
      }
      return accumulator;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10);

  const topSources = Object.entries(
    articles.reduce<Record<string, number>>((accumulator, article) => {
      const source = article.source ?? "Unknown";
      accumulator[source] = (accumulator[source] ?? 0) + 1;
      return accumulator;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8);

  const categoryCounts = Object.entries(
    articles.reduce<Record<string, number>>((accumulator, article) => {
      accumulator[article.domain] = (accumulator[article.domain] ?? 0) + 1;
      return accumulator;
    }, {}),
  ).sort((left, right) => right[1] - left[1]);

  const leadingCategory = categoryCounts[0]?.[0] ?? "Macro";
  const leadingTag = topTags[0]?.[0] ?? "uncategorized";
  const insights = [
    `${leadingCategory}-related coverage is leading the current dashboard window.`,
    `The strongest recurring pattern tag right now is ${leadingTag}.`,
    "Cross-source duplication is trimmed at ingest time, so repeated headlines do not dominate the feed.",
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="rounded-[2rem] border border-line bg-white p-8 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
              Pattern View
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">
              Tag frequency and simple trend detection
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-line bg-mist px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
          >
            Back to Dashboard
          </Link>
        </div>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold text-ink">Top Tags</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {topTags.map(([tag, count]) => (
              <div
                key={tag}
                className="flex items-center justify-between rounded-2xl border border-line bg-mist px-5 py-4"
              >
                <span className="font-medium text-ink">#{tag}</span>
                <span className="text-sm text-slate-500">{count} mentions</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-ink">Top Sources</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {topSources.map(([source, count]) => (
              <div
                key={source}
                className="flex items-center justify-between rounded-2xl border border-line bg-white px-5 py-4"
              >
                <span className="font-medium text-ink">{source}</span>
                <span className="text-sm text-slate-500">{count} mentions</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-ink">Category Mix</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {categoryCounts.map(([category, count]) => (
              <div
                key={category}
                className="flex items-center justify-between rounded-2xl border border-line bg-white px-5 py-4"
              >
                <span className="font-medium text-ink">{category}</span>
                <span className="text-sm text-slate-500">{count} articles</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-ink">Insights</h2>
          <div className="mt-4 space-y-3">
            {insights.map((insight) => (
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
