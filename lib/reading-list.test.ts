import { describe, expect, it } from "vitest";
import { buildReadingList, topicActivity, uniqueArticles } from "./reading-list";
import type { Article } from "./types";

const now = Date.parse("2026-09-21T12:00:00Z");
function article(id: string, domain: Article["domain"] = "LLM", overrides: Partial<Article> = {}): Article {
  return { id, headline: `Story ${id}`, date: "2026-09-21", processed_at: "2026-09-21", week: "2026-W39", domain, tags: [], summary: "Feed summary", importance: 3, source: id, ...overrides };
}

describe("broad reading list", () => {
  it("keeps a flood of AI articles from crowding other fields out of the first six", () => {
    const stories = Array.from({ length: 50 }, (_, i) => article(`AI${i}`, "LLM", { importance: 5 }));
    stories.push(article("chips", "Semis"), article("climate", "Climate"), article("security", "Security"), article("robot", "Robotics"), article("consumer", "Consumer"));
    const first = buildReadingList(stories, ["LLM"], now).slice(0, 6);
    expect(new Set(first.map(({ article }) => article.domain)).size).toBe(6);
    expect(first[0].article.domain).toBe("LLM");
  });
  it("does not mistake a newly ingested old article for fresh reporting", () => {
    const result = buildReadingList([article("old", "LLM", { date: "2025-01-01", importance: 5 }), article("new", "LLM")], [], now);
    expect(result[0].article.id).toBe("new");
  });
  it("collapses tracking links and repeated headlines without mutating inputs", () => {
    const input = [article("a", "LLM", { url: "https://example.com/story?utm_source=rss" }), article("b", "LLM", { url: "https://example.com/story" }), article("c", "LLM", { headline: "Story a!" })];
    expect(uniqueArticles(input)).toHaveLength(1);
    expect(input).toHaveLength(3);
  });
  it("does not use stale coverage to fill a missing field ahead of fresh stories", () => {
    const input = [article("one"), article("two"), article("old-science", "Bio", { date: "2025-01-01" })];
    expect(buildReadingList(input, [], now).map(({ article }) => article.id)).toEqual(["one", "two", "old-science"]);
  });
  it("counts only recent reporting for topic activity", () => {
    const topics = topicActivity([article("today"), article("past", "LLM", { date: "2026-09-11" }), article("ancient", "LLM", { date: "2025-01-01" })], now);
    expect(topics[0]).toMatchObject({ current: 1, previous: 1 });
  });
});
