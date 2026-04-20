import { headlineSimilarity, isDuplicate, isLikelySameStory, tokenizeText } from "./dedup";
import { extractEntities, mergeEntities } from "./entities";
import { computeClusterConfidence, computeClusterImpactScore } from "./scoring";
import type { Article, ArticleDomain, StoryCluster } from "./types";

const CLUSTER_HEADLINE_THRESHOLD = 0.58;
const ENTITY_OVERLAP_THRESHOLD = 1;
const TOPIC_OVERLAP_THRESHOLD = 2;

const TOPIC_KEYWORDS = new Set([
  "agent",
  "ai",
  "battery",
  "chip",
  "cloud",
  "compute",
  "cyber",
  "data",
  "datacenter",
  "energy",
  "gpu",
  "inference",
  "memory",
  "model",
  "nuclear",
  "openai",
  "power",
  "regulation",
  "robot",
  "semiconductor",
  "security",
]);

function stableSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function extractTopicKeywords(article: Article) {
  const tokens = tokenizeText(`${article.headline} ${article.summary} ${article.tags.join(" ")}`);
  return unique(tokens.filter((token) => TOPIC_KEYWORDS.has(token) || article.tags.includes(token)));
}

function overlapCount(left: string[], right: string[]) {
  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  return left.filter((value) => rightSet.has(value.toLowerCase())).length;
}

function primaryDomain(articles: Article[]): ArticleDomain {
  const domainCounts = new Map<ArticleDomain, number>();

  for (const article of articles) {
    domainCounts.set(article.domain, (domainCounts.get(article.domain) ?? 0) + 1);
  }

  return [...domainCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ??
    articles[0]?.domain ??
    "General";
}

function clusterSummary(articles: Article[]) {
  const lead = articles
    .slice()
    .sort((left, right) => right.importance - left.importance)[0];
  const sourceCount = unique(articles.map((article) => article.source)).length;

  if (articles.length === 1) {
    return lead.summary;
  }

  return `${lead.summary} Tracked across ${articles.length} articles from ${sourceCount} sources.`;
}

export function fallbackWhyItMatters(
  cluster: Pick<StoryCluster, "tags" | "domain" | "sources" | "entities">,
) {
  const leadTag = cluster.tags[0]?.replace(/_/g, " ") ?? "this signal";
  const leadEntity = cluster.entities.find((entity) => entity.type !== "other")?.name;
  const subject = leadEntity ?? leadTag;
  const sourceText =
    cluster.sources.length > 1
      ? `${cluster.sources.length} sources are reinforcing the story`
      : "one source is reporting the story";

  return [
    `${sourceText}, making ${subject} worth tracking in ${cluster.domain}.`,
    `The technical implication centers on execution constraints around ${leadTag}.`,
    "Watch for follow-on reporting, customer adoption, regulation, or supply-chain effects.",
  ];
}

function belongsInCluster(article: Article, clusterArticles: Article[]) {
  return clusterArticles.some((candidate) => {
    if (isLikelySameStory(article, candidate)) {
      return true;
    }

    if (headlineSimilarity(article.headline, candidate.headline) >= CLUSTER_HEADLINE_THRESHOLD) {
      return true;
    }

    const entityOverlap = overlapCount(
      extractEntities(article).map((entity) => entity.normalized),
      extractEntities(candidate).map((entity) => entity.normalized),
    );
    if (entityOverlap >= ENTITY_OVERLAP_THRESHOLD) {
      return true;
    }

    const topicOverlap = overlapCount(
      extractTopicKeywords(article),
      extractTopicKeywords(candidate),
    );
    return topicOverlap >= TOPIC_OVERLAP_THRESHOLD;
  });
}

function buildCluster(articles: Article[]): StoryCluster {
  const sorted = [...articles].sort((left, right) => {
    return (
      right.importance - left.importance ||
      new Date(right.date).getTime() - new Date(left.date).getTime()
    );
  });
  const lead = sorted[0];
  const times = articles.map((article) =>
    new Date(article.processed_at || article.date).getTime(),
  );
  const firstSeenAt = new Date(Math.min(...times)).toISOString();
  const lastSeenAt = new Date(Math.max(...times)).toISOString();
  const tags = unique(articles.flatMap((article) => article.tags)).slice(0, 8);
  const sources = unique(articles.map((article) => article.source));
  const entities = mergeEntities(articles.map((article) => extractEntities(article))).slice(0, 12);
  const cluster: StoryCluster = {
    id: `cluster-${stableSlug(lead.headline || lead.id)}`,
    headline: lead.headline,
    summary: clusterSummary(sorted),
    whyItMatters: [],
    domain: primaryDomain(articles),
    tags,
    entities,
    articleIds: sorted.map((article) => article.id),
    sources,
    sourceCount: sources.length,
    confidence: "low",
    impactScore: 1,
    firstSeenAt,
    lastSeenAt,
  };

  cluster.confidence = computeClusterConfidence(cluster);
  cluster.impactScore = computeClusterImpactScore(cluster, articles);
  cluster.whyItMatters = fallbackWhyItMatters(cluster);
  return cluster;
}

export function deduplicateArticles(articles: Article[]) {
  const deduped: Article[] = [];

  for (const article of articles) {
    const existingIndex = deduped.findIndex((candidate) => isDuplicate(article, candidate));

    if (existingIndex === -1) {
      deduped.push(article);
      continue;
    }

    if (article.importance >= deduped[existingIndex].importance) {
      deduped[existingIndex] = article;
    }
  }

  return deduped;
}

export function clusterArticles(articles: Article[]) {
  const groups: Article[][] = [];
  const sortedArticles = [...articles].sort((left, right) => {
    return (
      new Date(right.date).getTime() - new Date(left.date).getTime() ||
      right.importance - left.importance
    );
  });

  for (const article of sortedArticles) {
    const group = groups.find((candidateGroup) => belongsInCluster(article, candidateGroup));

    if (group) {
      group.push(article);
    } else {
      groups.push([article]);
    }
  }

  return groups
    .map((group) => buildCluster(group))
    .sort((left, right) => right.impactScore - left.impactScore);
}
