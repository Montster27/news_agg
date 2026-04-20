import "server-only";

import { AI_INSIGHT_MODEL, getOpenAIClient } from "@/lib/ai-client";
import { fallbackWhyItMatters } from "@/lib/clustering";
import type { StoryCluster } from "@/lib/types";

const client = getOpenAIClient();

function normalizeBulletText(value: string) {
  return value
    .split(/\n+/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => `- ${line}`)
    .join("\n");
}

export async function generateWhyItMatters(cluster: StoryCluster) {
  if (!client) {
    return fallbackWhyItMatters(cluster);
  }

  try {
    const response = await client.chat.completions.create({
      model: AI_INSIGHT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You write concise technology intelligence. Return exactly three bullets: strategic impact, technical implication, future direction.",
        },
        {
          role: "user",
          content: JSON.stringify({
            summary: cluster.summary,
            tags: cluster.tags,
            domain: cluster.domain,
          }),
        },
      ],
      max_tokens: 240,
    });

    const content = response.choices[0]?.message.content ?? "";
    return normalizeBulletText(content) || fallbackWhyItMatters(cluster);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown synthesis error";
    console.warn(`[cluster] generateWhyItMatters failed: ${message}`);
    return fallbackWhyItMatters(cluster);
  }
}

export async function synthesizeWhyItMatters(clusters: StoryCluster[]) {
  const synthesized: StoryCluster[] = [];

  for (const cluster of clusters) {
    synthesized.push({
      ...cluster,
      why_it_matters: await generateWhyItMatters(cluster),
    });
  }

  return synthesized;
}
