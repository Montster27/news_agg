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

export type StoryCluster = {
  id: string;
  headline: string;
  summary: string;
  why_it_matters: string;
  articles: Article[];
  sources: string[];
  tags: string[];
  domain: string;
  impactScore: number;
  confidence: "low" | "medium" | "high";
  created_at: string;
  updated_at: string;
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
