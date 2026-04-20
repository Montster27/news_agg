import { describe, expect, it } from "vitest";
import { clusterArticles } from "./clustering";
import { isDuplicate, normalizeUrl } from "./dedup";
import { computeImpactScore } from "./scoring";
import type { Article } from "./types";

function article(overrides: Partial<Article> = {}): Article {
  return {
    id: "article-1",
    date: "2026-04-20",
    processed_at: "2026-04-20T12:00:00.000Z",
    week: "2026-17",
    domain: "AI",
    headline: "OpenAI expands data center infrastructure for inference demand",
    summary: "OpenAI is adding infrastructure capacity as inference demand grows.",
    source: "Source A",
    url: "https://example.com/story?utm_source=newsletter",
    tags: ["ai_infrastructure", "inference"],
    importance: 4,
    ...overrides,
  };
}

describe("story clustering", () => {
  it("normalizes URLs and detects duplicate articles", () => {
    const first = article();
    const second = article({
      id: "article-2",
      source: "Source B",
      url: "https://www.example.com/story",
      headline: "OpenAI expands data center infrastructure for AI inference demand",
    });

    expect(normalizeUrl(first.url)).toBe("https://example.com/story");
    expect(isDuplicate(first, second)).toBe(true);
  });

  it("groups similar stories into source-backed clusters", () => {
    const clusters = clusterArticles([
      article(),
      article({
        id: "article-2",
        source: "Source B",
        url: "https://source-b.test/openai-data-centers",
        headline: "OpenAI adds data center capacity for inference growth",
        summary: "A second outlet reports OpenAI is growing data center capacity.",
      }),
      article({
        id: "article-3",
        source: "Source C",
        url: "https://source-c.test/battery",
        headline: "Battery startup opens pilot factory for grid storage",
        summary: "A battery company is opening a new pilot facility.",
        domain: "Energy",
        tags: ["battery", "grid"],
        importance: 3,
      }),
    ]);

    expect(clusters).toHaveLength(2);
    expect(clusters[0].sources).toHaveLength(2);
    expect(clusters[0].confidence).toBe("medium");
  });

  it("assigns higher impact to multi-source strategic clusters", () => {
    const [singleSource] = clusterArticles([
      article({
        tags: ["general"],
        importance: 2,
      }),
    ]);
    const [multiSource] = clusterArticles([
      article(),
      article({
        id: "article-2",
        source: "Source B",
        url: "https://source-b.test/openai-data-centers",
        headline: "OpenAI adds data center capacity for inference growth",
      }),
      article({
        id: "article-3",
        source: "Source C",
        url: "https://source-c.test/openai-infra",
        headline: "OpenAI infrastructure buildout targets inference demand",
      }),
    ]);

    expect(computeImpactScore(multiSource)).toBeGreaterThan(computeImpactScore(singleSource));
    expect(multiSource.confidence).toBe("high");
  });
});
