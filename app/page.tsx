import { CommandCenterClient } from "@/components/CommandCenterClient";
import { generateWeeklyBrief } from "@/lib/brief";
import { analyzeLongTermTrends } from "@/lib/db";
import { ingestFeeds } from "@/lib/ingest";
import { generateInsightReport } from "@/lib/insights";
import { analyzePatterns, analyzePatternsWithPersistence } from "@/lib/patterns";
import { fallbackArticles } from "@/lib/data";
import type { WeeklyBrief } from "@/lib/brief";
import type { InsightEngineResult } from "@/lib/insights";
import type { LongTermTrendAnalysis } from "@/lib/db";

export const dynamic = "force-dynamic";

function desktopBootstrapData() {
  const articles = fallbackArticles;
  const patterns = analyzePatterns(articles, "All");
  const now = new Date().toISOString();
  const brief: WeeklyBrief = {
    top_shifts: [
      "Desktop local cache is loading.",
      "Search and dashboard data will hydrate from SQLite after the window opens.",
      "Manual refresh remains available from desktop controls.",
    ],
    emerging_patterns: [
      "Local-first reads are prioritized in desktop mode.",
      "RSS and AI enrichment run through refresh jobs instead of blocking window startup.",
      "Cached articles remain searchable offline.",
    ],
    what_to_watch: [
      "Use Refresh when you want to update local feeds.",
      "Use Search First to query cached articles.",
      "Rebuild the search index from Settings if local search looks stale.",
    ],
    teaching_points: [
      "Desktop bootstrap data is only a startup shell.",
      "SQLite remains the source for local desktop content.",
    ],
    generated_at: now,
    used_fallback: true,
  };
  const longTermTrends: LongTermTrendAnalysis = {
    rising: [],
    declining: [],
    stable: [],
    available: false,
  };
  const insightReport: InsightEngineResult = {
    insights: [],
    inflections: [],
    crossDomainShifts: [],
    generatedAt: now,
    usedFallback: true,
  };

  return {
    articles,
    brief,
    patterns,
    longTermTrends,
    insightReport,
    fetchedAt: now,
  };
}

export default async function DashboardPage() {
  if (process.env.ELECTRON_RENDERER_MODE === "desktop") {
    return <CommandCenterClient {...desktopBootstrapData()} />;
  }

  const { articles, fetchedAt } = await ingestFeeds();
  const patterns = await analyzePatternsWithPersistence(articles, "All");
  const brief = await generateWeeklyBrief(articles, patterns);
  const longTermTrends = await analyzeLongTermTrends("All");
  const insightReport = await generateInsightReport({
    articles,
    patterns,
    longTermTrends: longTermTrends.rising,
  });

  return (
    <CommandCenterClient
      articles={articles}
      brief={brief}
      patterns={patterns}
      longTermTrends={longTermTrends}
      insightReport={insightReport}
      fetchedAt={fetchedAt}
    />
  );
}
