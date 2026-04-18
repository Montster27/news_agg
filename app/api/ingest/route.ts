import { NextRequest, NextResponse } from "next/server";
import { Article, ArticleDomain } from "@/lib/types";

const domains: ArticleDomain[] = ["AI", "Chips", "Infra", "Bio", "Energy", "Macro"];

type IngestPayload = {
  headline?: string;
  domain?: string;
  content?: string;
  importance?: number;
};

function inferTags(source: string): string[] {
  const keywords = [
    "ai",
    "chips",
    "memory",
    "gpu",
    "data-centers",
    "power",
    "graphene",
    "batteries",
    "macro",
    "cloud",
    "inference",
  ];

  const normalized = source.toLowerCase();
  const found = keywords.filter((keyword) =>
    normalized.includes(keyword.replace("-", " ")) || normalized.includes(keyword),
  );

  return found.length ? found : ["tech", "monitoring"];
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as IngestPayload;

  if (!body.headline || !body.domain) {
    return NextResponse.json(
      { error: "headline and domain are required" },
      { status: 400 },
    );
  }

  const domain = domains.includes(body.domain as ArticleDomain)
    ? (body.domain as ArticleDomain)
    : "Macro";

  const sourceText = [body.headline, body.content].filter(Boolean).join(". ");
  const tags = inferTags(sourceText);

  const article: Article = {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    domain,
    headline: body.headline,
    summary:
      body.content?.slice(0, 180) ||
      `Mock summary: ${body.headline} is being processed into the daily dashboard with lightweight signal extraction.`,
    tags,
    importance:
      body.importance && body.importance >= 1 && body.importance <= 5
        ? (body.importance as Article["importance"])
        : 3,
  };

  return NextResponse.json({ article });
}
