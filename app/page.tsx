import { CommandCenterClient } from "@/components/CommandCenterClient";
import { generateWeeklyBrief } from "@/lib/brief";
import { analyzeLongTermTrends } from "@/lib/db";
import { ingestFeeds } from "@/lib/ingest";
import { generateInsightReport } from "@/lib/insights";
import { analyzePatternsWithPersistence } from "@/lib/patterns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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
