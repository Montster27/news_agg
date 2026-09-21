import { ReadingHome } from "@/components/ReadingHome";
import { getLatestArticles, hasDatabase } from "@/lib/db";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let articles: Article[] = [];
  let error: string | null = null;
  if (process.env.ELECTRON_RENDERER_MODE !== "desktop" && hasDatabase()) {
    try {
      articles = await getLatestArticles("All", 200);
    } catch {
      error = "Couldn't load your reading list. Try reloading in a moment.";
    }
  }
  return <ReadingHome initialArticles={articles} initialError={error} />;
}
