import { describe, expect, it } from "vitest";
import {
  getEffectiveImportance,
  getLearnedAdjustment,
  parseImportanceFeedback,
  rebuildLearningProfile,
} from "./feedback";
import { scoreArticle, type UserProfile } from "./user";
import type { Article, ImportanceFeedback } from "./types";

const baseProfile: UserProfile = {
  preferred_domains: [],
  preferred_tags: [],
  excluded_tags: [],
  importance_weights: {
    tag_match: 2,
    domain_match: 1.5,
  },
};

function article(overrides: Partial<Article> = {}): Article {
  return {
    id: "a1",
    date: "2026-04-18",
    processed_at: "2026-04-18T00:00:00.000Z",
    week: "2026-16",
    domain: "AI",
    headline: "AI data centers strain power supply",
    summary: "Operators are shifting infrastructure plans around power constraints.",
    tags: ["ai_infrastructure", "energy_constraint"],
    importance: 3,
    ...overrides,
  };
}

describe("importance feedback", () => {
  it("loads only valid persisted feedback", () => {
    const parsed = parseImportanceFeedback(
      JSON.stringify({
        a1: {
          articleId: "a1",
          originalImportance: 3,
          userImportance: 5,
          updatedAt: "2026-04-18T00:00:00.000Z",
        },
        bad: {
          articleId: "bad",
          originalImportance: 6,
          userImportance: 1,
        },
      }),
    );

    expect(parsed.a1?.userImportance).toBe(5);
    expect(parsed.bad).toBeUndefined();
  });

  it("uses a user override as effective importance", () => {
    const target = article();
    const feedback: Record<string, ImportanceFeedback> = {
      a1: {
        articleId: "a1",
        originalImportance: 3,
        userImportance: 5,
        updatedAt: "2026-04-18T00:00:00.000Z",
      },
    };

    expect(getEffectiveImportance(target, feedback)).toBe(5);
  });

  it("builds capped learned adjustments from repeated feedback", () => {
    const articles = [
      article({ id: "a1", domain: "AI" }),
      article({ id: "a2", domain: "AI", importance: 2 }),
      article({ id: "a3", domain: "Macro", tags: ["consumer_gadgets"] }),
    ];
    const feedback: Record<string, ImportanceFeedback> = {
      a1: {
        articleId: "a1",
        originalImportance: 3,
        userImportance: 5,
        updatedAt: "2026-04-18T00:00:00.000Z",
      },
      a2: {
        articleId: "a2",
        originalImportance: 2,
        userImportance: 4,
        updatedAt: "2026-04-18T00:00:00.000Z",
      },
      a3: {
        articleId: "a3",
        originalImportance: 3,
        userImportance: 1,
        updatedAt: "2026-04-18T00:00:00.000Z",
      },
    };

    const learning = rebuildLearningProfile(articles, feedback);

    expect(learning.sampleCount).toBe(3);
    expect(getLearnedAdjustment(article({ id: "future" }), learning)).toBeGreaterThan(0);
    expect(
      getLearnedAdjustment(article({ id: "future2", domain: "Macro", tags: ["consumer_gadgets"] }), learning),
    ).toBeLessThan(0);
  });

  it("changes ranking when feedback changes effective importance", () => {
    const low = article({ id: "low", headline: "Low", importance: 2 });
    const high = article({ id: "high", headline: "High", importance: 4 });
    const feedback: Record<string, ImportanceFeedback> = {
      low: {
        articleId: "low",
        originalImportance: 2,
        userImportance: 5,
        updatedAt: "2026-04-18T00:00:00.000Z",
      },
    };

    const ranked = [low, high].sort(
      (left, right) =>
        scoreArticle(right, baseProfile, feedback) -
        scoreArticle(left, baseProfile, feedback),
    );

    expect(ranked[0]?.id).toBe("low");
  });

  it("returns to baseline after reset-style feedback removal", () => {
    const target = article();

    expect(getEffectiveImportance(target, {})).toBe(3);
    expect(scoreArticle(target, baseProfile, {})).toBe(3);
  });
});
