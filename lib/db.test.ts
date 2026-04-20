import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoryCluster } from "./types";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("pg", () => ({
  Pool: vi.fn(() => ({
    query: queryMock,
  })),
}));
vi.mock("server-only", () => ({}));

function cluster(overrides: Partial<StoryCluster> = {}): StoryCluster {
  return {
    id: "cluster-openai-infra",
    headline: "OpenAI expands AI infrastructure plans",
    summary: "OpenAI is adding data center capacity.",
    whyItMatters: ["Business impact", "Technical impact", "Watch capacity"],
    domain: "AI",
    tags: ["ai_infrastructure", "energy_constraint"],
    entities: [{ name: "OpenAI", normalized: "openai", type: "company" }],
    articleIds: ["article-1", "article-2"],
    sources: ["Source A", "Source B"],
    sourceCount: 2,
    confidence: "medium",
    impactScore: 8.1,
    firstSeenAt: "2026-04-20T10:00:00.000Z",
    lastSeenAt: "2026-04-20T12:00:00.000Z",
    ...overrides,
  };
}

describe("story cluster database helpers", () => {
  afterEach(() => {
    vi.resetModules();
    queryMock.mockReset();
    delete process.env.POSTGRES_URL;
  });

  it("persists clusters and article memberships", async () => {
    process.env.POSTGRES_URL = "postgres://local/test";
    queryMock.mockResolvedValue({ rows: [] });

    const { saveStoryClustersToDb } = await import("./db");
    await saveStoryClustersToDb([cluster()]);

    const sql = queryMock.mock.calls.map(([statement]) => String(statement)).join("\n");
    const params = queryMock.mock.calls.map(([, values]) => values);

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS story_clusters");
    expect(sql).toContain("INSERT INTO story_clusters");
    expect(sql).toContain("INSERT INTO story_cluster_articles");
    expect(params.some((values) => values?.[0] === "cluster-openai-infra")).toBe(true);
  });

  it("loads latest clusters with article ids", async () => {
    process.env.POSTGRES_URL = "postgres://local/test";
    queryMock.mockResolvedValueOnce({ rows: [] });
    queryMock.mockResolvedValue({
      rows: [
        {
          id: "cluster-openai-infra",
          headline: "OpenAI expands AI infrastructure plans",
          summary: "OpenAI is adding data center capacity.",
          why_it_matters: ["Business impact", "Technical impact", "Watch capacity"],
          domain: "AI",
          tags: ["ai_infrastructure"],
          entities: [{ name: "OpenAI", normalized: "openai", type: "company" }],
          sources: ["Source A"],
          source_count: 1,
          confidence: "low",
          impact_score: 6.5,
          first_seen_at: "2026-04-20T10:00:00.000Z",
          last_seen_at: "2026-04-20T12:00:00.000Z",
          article_ids: ["article-1"],
        },
      ],
    });

    const { getLatestStoryClusters } = await import("./db");
    const clusters = await getLatestStoryClusters("AI", 10);

    expect(clusters[0]?.articleIds).toEqual(["article-1"]);
    expect(clusters[0]?.whyItMatters).toHaveLength(3);
    expect(clusters[0]?.impactScore).toBe(6.5);
  });
});
