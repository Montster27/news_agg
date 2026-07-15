// Cloud-model weekly brief generation for the desktop app.
//
// Per-article enrichment stays local (Ollama); the weekly brief is a low-volume,
// high-value synthesis, so it's the right place to use a cloud model. This reuses
// the same provider keys the chat uses (Settings → Claude/OpenAI/Gemini) and
// falls back to the heuristic brief when no provider is configured or a call fails.

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");
const {
  analyzeArticles,
  createBrief,
} = require("../repositories/patternsRepo");

const BRIEF_TIMEOUT_MS = Number(process.env.AI_BRIEF_TIMEOUT_MS) || 60000;

// Cheapest/fastest tier per provider — same rationale as the chat sidebar.
const CLAUDE_MODEL = "claude-haiku-4-5";
const OPENAI_MODEL = "gpt-4o-mini";
const GEMINI_MODEL = "gemini-2.0-flash-lite";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const MAX_ARTICLES_IN_PROMPT = 40;

const SYSTEM_PROMPT = `You are a senior technology-intelligence analyst writing a concise weekly brief for a founder/investor who tracks AI, semiconductors, compute infrastructure, energy, security, biotech, robotics, and adjacent frontier tech.

Rules:
- Ground every point in the supplied articles; be specific, cite concrete developments, avoid generic filler.
- Prefer signal over volume: what actually shifted, what's emerging, what to watch.
- Return ONLY valid JSON, no prose outside the JSON.`;

function extractJson(content) {
  const trimmed = String(content ?? "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(trimmed.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeBullets(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function buildUserPrompt(week, articles) {
  const ranked = [...articles].sort(
    (a, b) =>
      (b.importance ?? 0) - (a.importance ?? 0) ||
      new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
  );
  const items = ranked.slice(0, MAX_ARTICLES_IN_PROMPT).map((a) => ({
    headline: a.headline,
    domain: a.domain,
    tags: (a.tags ?? []).slice(0, 4),
    importance: a.importance,
    source: a.source,
  }));

  const tagCounts = {};
  const domainCounts = {};
  for (const article of articles) {
    for (const tag of article.tags ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
    if (article.domain) domainCounts[article.domain] = (domainCounts[article.domain] ?? 0) + 1;
  }
  const topTags = Object.entries(tagCounts)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 15);

  return `Week: ${week}
Total articles this week: ${articles.length}
Domain distribution: ${JSON.stringify(domainCounts)}
Top tags (tag, count): ${JSON.stringify(topTags)}

Top articles (ranked by importance):
${JSON.stringify(items, null, 2)}

Write the weekly brief as JSON with exactly this shape:
{
  "top_shifts": ["3-5 bullets on the biggest shifts this week, each citing concrete stories"],
  "emerging_patterns": ["3-5 bullets on cross-story patterns and themes"],
  "what_to_watch": ["3-5 forward-looking bullets"],
  "teaching_points": ["2-3 durable takeaways or mental models"]
}`;
}

async function callClaude(apiKey, system, user) {
  const client = new Anthropic({ apiKey, timeout: BRIEF_TIMEOUT_MS });
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: user }],
  });
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

async function callOpenAI(apiKey, system, user) {
  const client = new OpenAI({ apiKey, timeout: BRIEF_TIMEOUT_MS });
  const response = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });
  return response.choices?.[0]?.message?.content ?? "";
}

async function callGemini(apiKey, system, user) {
  const response = await fetch(
    `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(BRIEF_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Gemini ${response.status}: ${text.slice(0, 200)}`);
  }
  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") ?? ""
  );
}

// Pick the configured cloud provider, mirroring the chat's priority.
function resolveProvider(preferences = {}) {
  if (preferences.claudeEnabled && preferences.claudeApiKey) {
    return { provider: "claude", apiKey: preferences.claudeApiKey, model: CLAUDE_MODEL };
  }
  if (preferences.openaiEnabled && preferences.openaiApiKey) {
    return { provider: "openai", apiKey: preferences.openaiApiKey, model: OPENAI_MODEL };
  }
  if (preferences.geminiEnabled && preferences.geminiApiKey) {
    return { provider: "gemini", apiKey: preferences.geminiApiKey, model: GEMINI_MODEL };
  }
  return null;
}

// Generate a brief with the cloud model. Returns null (never throws) when no
// provider is configured; throws on an actual provider error so the caller can
// log and fall back.
async function generateCloudBrief({ preferences, week, articles }) {
  const resolved = resolveProvider(preferences);
  if (!resolved) return null;

  const user = buildUserPrompt(week, articles ?? []);
  let text;
  if (resolved.provider === "claude") {
    text = await callClaude(resolved.apiKey, SYSTEM_PROMPT, user);
  } else if (resolved.provider === "openai") {
    text = await callOpenAI(resolved.apiKey, SYSTEM_PROMPT, user);
  } else {
    text = await callGemini(resolved.apiKey, SYSTEM_PROMPT, user);
  }

  const parsed = extractJson(text);
  if (!parsed || typeof parsed !== "object") return null;

  const brief = {
    top_shifts: normalizeBullets(parsed.top_shifts),
    emerging_patterns: normalizeBullets(parsed.emerging_patterns),
    what_to_watch: normalizeBullets(parsed.what_to_watch),
    teaching_points: normalizeBullets(parsed.teaching_points),
    generated_at: new Date().toISOString(),
    used_fallback: false,
    provider: resolved.provider,
    model: resolved.model,
  };

  // Require at least the headline section, else treat as a failed generation.
  if (!brief.top_shifts.length) return null;
  return brief;
}

// Cloud-first weekly brief with heuristic fallback. Always returns a valid brief.
async function buildWeeklyBrief(db, { week, articles = [], analysis }) {
  const { getPreferences } = require("../repositories/preferencesRepo");
  const preferences = getPreferences(db);

  try {
    const cloud = await generateCloudBrief({ preferences, week, articles });
    if (cloud) return cloud;
  } catch (error) {
    console.warn(
      `[brief] cloud generation failed for ${week}: ${error instanceof Error ? error.message : "Unknown"}; using heuristic`,
    );
  }

  return createBrief(analysis ?? analyzeArticles(articles, "All"), articles);
}

module.exports = {
  buildWeeklyBrief,
  generateCloudBrief,
  resolveProvider,
  CLAUDE_MODEL,
  OPENAI_MODEL,
  GEMINI_MODEL,
};
