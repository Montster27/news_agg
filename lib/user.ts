import {
  getEffectiveImportance,
  getLearnedAdjustment,
  type ImportanceLearningProfile,
} from "@/lib/feedback";
import { Article, ArticleDomain, ImportanceFeedback, StoryCluster } from "@/lib/types";

export type UserProfile = {
  preferred_domains: ArticleDomain[];
  preferred_tags: string[];
  excluded_tags: string[];
  importance_weights: {
    tag_match: number;
    domain_match: number;
  };
};

export const defaultUserProfile: UserProfile = {
  preferred_domains: ["AI", "Chips"],
  preferred_tags: ["ai_infrastructure", "energy_constraint"],
  excluded_tags: ["consumer_gadgets"],
  importance_weights: {
    tag_match: 2,
    domain_match: 1.5,
  },
};

const STORAGE_KEY = "news-agg-user-profile";

export function loadUserProfile() {
  if (typeof window === "undefined") {
    return defaultUserProfile;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return defaultUserProfile;
  }

  try {
    return {
      ...defaultUserProfile,
      ...JSON.parse(stored),
      importance_weights: {
        ...defaultUserProfile.importance_weights,
        ...JSON.parse(stored).importance_weights,
      },
    } as UserProfile;
  } catch {
    return defaultUserProfile;
  }
}

export function saveUserProfile(profile: UserProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function articleHasExcludedTag(article: Article, profile: UserProfile) {
  return article.tags.some((tag) => profile.excluded_tags.includes(tag));
}

export function scoreArticle(
  article: Article,
  profile: UserProfile,
  feedback?: Record<string, ImportanceFeedback>,
  learningProfile?: ImportanceLearningProfile,
) {
  const tagMatches = article.tags.filter((tag) =>
    profile.preferred_tags.includes(tag),
  ).length;
  const domainMatch = profile.preferred_domains.includes(article.domain) ? 1 : 0;
  const effectiveImportance = getEffectiveImportance(article, feedback ?? {});
  const learnedAdjustment = learningProfile
    ? getLearnedAdjustment(article, learningProfile)
    : 0;

  return (
    effectiveImportance +
    tagMatches * profile.importance_weights.tag_match +
    domainMatch * profile.importance_weights.domain_match +
    learnedAdjustment
  );
}

export function scoreStoryCluster(cluster: StoryCluster, profile: UserProfile) {
  const tagMatches = cluster.tags.filter((tag) =>
    profile.preferred_tags.includes(tag),
  ).length;
  const domainMatch = profile.preferred_domains.includes(cluster.domain) ? 1 : 0;
  const excludedPenalty = cluster.tags.some((tag) => profile.excluded_tags.includes(tag))
    ? 2
    : 0;

  return (
    cluster.impactScore +
    tagMatches * profile.importance_weights.tag_match +
    domainMatch * profile.importance_weights.domain_match -
    excludedPenalty
  );
}
