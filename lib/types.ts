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

export type ImportanceFeedback = {
  articleId: string;
  originalImportance: 1 | 2 | 3 | 4 | 5;
  userImportance: 1 | 2 | 3 | 4 | 5;
  updatedAt: string;
};

export type ArticleWithEffectiveImportance = Article & {
  effectiveImportance?: 1 | 2 | 3 | 4 | 5;
};
