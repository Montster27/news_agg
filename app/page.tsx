import { CommandCenterClient } from "@/components/CommandCenterClient";
import { generateWeeklyBrief } from "@/lib/brief";
import { analyzeLongTermTrends } from "@/lib/db";
import { ingestFeeds } from "@/lib/ingest";
import { analyzePatternsWithPersistence } from "@/lib/patterns";

export default async function DashboardPage() {
  const { articles, fetchedAt } = await ingestFeeds();
  const patterns = await analyzePatternsWithPersistence(articles, "All");
  const brief = await generateWeeklyBrief(articles, patterns);
  const longTermTrends = await analyzeLongTermTrends("All");

  return (
    <CommandCenterClient
      articles={articles}
      brief={brief}
      patterns={patterns}
      longTermTrends={longTermTrends}
      fetchedAt={fetchedAt}
    />
  );
}
