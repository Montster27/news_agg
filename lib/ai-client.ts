import "server-only";

import OpenAI from "openai";

const PLACEHOLDER_KEYS = new Set(["", "your_key_here"]);

function envNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  const baseURL = process.env.OPENAI_BASE_URL || undefined;

  if (!baseURL && PLACEHOLDER_KEYS.has(apiKey)) {
    return null;
  }

  return new OpenAI({
    apiKey: apiKey || "local",
    baseURL,
    maxRetries: envNumber("AI_MAX_RETRIES", 2),
    timeout: envNumber("AI_TIMEOUT_MS", 30000),
  });
}

export const AI_ARTICLE_MODEL = process.env.AI_ARTICLE_MODEL || "gpt-4o-mini";
export const AI_BRIEF_MODEL = process.env.AI_BRIEF_MODEL || "gpt-4o-mini";
export const AI_INSIGHT_MODEL = process.env.AI_INSIGHT_MODEL || "gpt-4o-mini";
