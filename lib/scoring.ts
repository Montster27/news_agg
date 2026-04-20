import type { StoryCluster } from "./types";

const STRATEGIC_TAGS = new Set([
  "ai_infrastructure",
  "chips",
  "energy_constraint",
  "data_centers",
  "frontier_models",
  "security",
  "regulation",
  "inference",
  "gpu",
  "cloud",
]);

type ImpactOptions = {
  preferredTags?: string[];
  previousClusters?: StoryCluster[];
  now?: Date;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function recencyScore(cluster: StoryCluster, now = new Date()) {
  const newestArticleTime = Math.max(
    ...cluster.articles.map((article) =>
      new Date(article.processed_at || article.date).getTime(),
    ),
    new Date(cluster.updated_at).getTime(),
  );
  const ageHours = (now.getTime() - newestArticleTime) / (60 * 60 * 1000);

  if (ageHours <= 12) return 2;
  if (ageHours <= 48) return 1.5;
  if (ageHours <= 168) return 1;
  return 0.5;
}

function tagAlignmentScore(cluster: StoryCluster, preferredTags?: string[]) {
  const tags = cluster.tags.map((tag) => tag.toLowerCase());
  const preferences = preferredTags?.length
    ? new Set(preferredTags.map((tag) => tag.toLowerCase()))
    : STRATEGIC_TAGS;
  const matches = tags.filter((tag) => preferences.has(tag)).length;

  return clamp(matches * 0.75, 0, 2);
}

function noveltyScore(cluster: StoryCluster, previousClusters: StoryCluster[] = []) {
  if (!previousClusters.length) {
    return 1;
  }

  const tagSet = new Set(cluster.tags);
  const similar = previousClusters.some((previous) => {
    const overlap = previous.tags.filter((tag) => tagSet.has(tag)).length;
    const overlapRatio = overlap / Math.max(new Set([...previous.tags, ...cluster.tags]).size, 1);
    return overlapRatio >= 0.6 || previous.headline.toLowerCase() === cluster.headline.toLowerCase();
  });

  return similar ? 0.25 : 1;
}

export function computeImpactScore(
  cluster: StoryCluster,
  options: ImpactOptions = {},
) {
  const sourceScore = cluster.sources.length * 2;
  const rawScore =
    sourceScore +
    recencyScore(cluster, options.now) +
    tagAlignmentScore(cluster, options.preferredTags) +
    noveltyScore(cluster, options.previousClusters);

  return Number(clamp(rawScore, 1, 10).toFixed(1));
}
