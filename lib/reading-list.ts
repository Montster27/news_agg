import type { Article, ArticleDomain } from "./types";

export const READING_TOPICS: { label: string; domains: ArticleDomain[] }[] = [
  { label: "AI & models", domains: ["LLM", "AIUse"] },
  { label: "Chips & infrastructure", domains: ["Semis", "AIInfra", "Cloud"] },
  { label: "Security & policy", domains: ["Security", "Policy"] },
  { label: "Science & climate", domains: ["Bio", "Climate", "Batteries", "Materials", "Space"] },
  { label: "Robotics", domains: ["Robotics"] },
  { label: "Consumer tech", domains: ["Consumer", "AR", "Crypto", "General"] },
];

export function articleTime(article: Article) {
  // processed_at is ingestion time, not the age of the reporting.
  const time = Date.parse(article.date);
  return Number.isFinite(time) ? time : 0;
}

export function uniqueArticles(articles: Article[]) {
  const urls = new Set<string>();
  const headlines = new Set<string>();
  return [...articles].sort((a, b) => articleTime(b) - articleTime(a)).filter((article) => {
    let url = article.url ?? article.id;
    try {
      const parsed = new URL(url);
      for (const key of [...parsed.searchParams.keys()]) {
        if (key.startsWith("utm_") || key === "fbclid") parsed.searchParams.delete(key);
      }
      parsed.hash = "";
      url = parsed.href.replace(/\/$/, "");
    } catch { /* Articles without a URL are deduped by id and headline. */ }
    const title = article.headline.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (urls.has(url) || headlines.has(title)) return false;
    urls.add(url);
    headlines.add(title);
    return true;
  });
}

function fieldFor(domain: ArticleDomain) {
  return READING_TOPICS.find((topic) => topic.domains.includes(domain))?.label ?? "Other tech";
}

export function buildReadingList(articles: Article[], followed: ArticleDomain[], now = Date.now()) {
  const day = 86_400_000;
  const ranked = uniqueArticles(articles).map((article) => {
    const age = Math.max(0, (now - articleTime(article)) / day);
    const matches = followed.includes(article.domain);
    // Age decays the entire score, so an old high-impact story cannot sit at the top forever.
    const score = (article.importance + (matches ? 3 : 0)) / (1 + age / 3);
    return { article, score, reason: matches ? "Matches your interests" : "Across tech" };
  }).sort((a, b) => b.score - a.score || articleTime(b.article) - articleTime(a.article));
  // Round-robin across broad fields, choosing the strongest story in each.
  // Source diversity breaks ties within a field without hiding its only coverage.
  const result: typeof ranked = [];
  const sources = new Map<string, number>();
  // Keep older coverage available, but never displace current reporting with it.
  const recent = ranked.filter(({ article }) => now - articleTime(article) <= 7 * day);
  const older = ranked.filter(({ article }) => now - articleTime(article) > 7 * day);
  for (const remaining of [recent, older]) {
    while (remaining.length) {
      const usedFields = new Set<string>();
      while (true) {
        const candidates = remaining.filter(({ article }) => !usedFields.has(fieldFor(article.domain)));
        if (!candidates.length) break;
        candidates.sort((a, b) =>
          b.score / (1 + (sources.get(b.article.source ?? "") ?? 0)) -
          a.score / (1 + (sources.get(a.article.source ?? "") ?? 0)),
        );
        const next = candidates[0];
        result.push({ ...next, reason: `${fieldFor(next.article.domain)} · ${next.reason}` });
        usedFields.add(fieldFor(next.article.domain));
        const source = next.article.source ?? "";
        sources.set(source, (sources.get(source) ?? 0) + 1);
        remaining.splice(remaining.indexOf(next), 1);
      }
    }
  }
  return result;
}

export function topicActivity(articles: Article[], now = Date.now()) {
  const day = 86_400_000;
  const unique = uniqueArticles(articles);
  return READING_TOPICS.map((topic) => {
    let current = 0;
    let previous = 0;
    for (const article of unique) {
      if (!topic.domains.includes(article.domain)) continue;
      const age = now - articleTime(article);
      if (age >= 0 && age < 7 * day) current++;
      else if (age >= 7 * day && age < 14 * day) previous++;
    }
    return { ...topic, current, previous };
  }).filter((topic) => topic.current > 0).sort((a, b) => b.current - a.current).slice(0, 3);
}
