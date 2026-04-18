import Link from "next/link";
import { articles } from "@/lib/data";

export default function PatternsPage() {
  const counts = articles.reduce<Record<string, number>>((accumulator, article) => {
    for (const tag of article.tags) {
      accumulator[tag] = (accumulator[tag] ?? 0) + 1;
    }

    return accumulator;
  }, {});

  const topTags = Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8);

  const insights = [
    "Energy-related topics are increasing as power access becomes a gating factor for AI expansion.",
    "Data center buildout appears across infra, chips, and macro coverage, which suggests infrastructure financing and deployment are tightly linked.",
    "Graphene and battery stories remain lower-volume, but they increasingly connect to practical operating constraints rather than pure research narratives.",
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
