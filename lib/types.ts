export type ArticleDomain =
  | "AI"
  | "Chips"
  | "Infra"
  | "Bio"
  | "Energy"
  | "Macro"
  | "General"
  | "Frontier";

export type Article = {
  id: string;
  date: string;
  processed_at: string;
  week: string;
  domain: ArticleDomain;
  headline: string;
  summary: string;
  source?: string;
  url?: string;
  tags: string[];
  importance: 1 | 2 | 3 | 4 | 5;
};

export type EntityType = "company" | "person" | "product" | "technology" | "place" | "other";

export type ExtractedEntity = {
  name: string;
  type: EntityType;
  normalized: string;
};

export type StoryCluster = {
  id: string;
  headline: string;
  summary: string;
  whyItMatters: string[];
  domain: ArticleDomain;
  tags: string[];
  entities: ExtractedEntity[];
  articleIds: string[];
  sources: string[];
  sourceCount: number;
  confidence: "low" | "medium" | "high";
  impactScore: number;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type ImportanceFeedback = {
  articleId: string;
  originalImportance: 1 | 2 | 3 | 4 | 5;
  userImportance: 1 | 2 | 3 | 4 | 5;
  updatedAt: string;
};

export type ArticleWithEffectiveImportance = Article & {
  effectiveImportance?: 1 | 2 | 3 | 4 | 5;
};
