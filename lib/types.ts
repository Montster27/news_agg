export type ArticleDomain = "AI" | "Chips" | "Infra" | "Bio" | "Energy" | "Macro";

export type Article = {
  id: string;
  date: string;
  domain: ArticleDomain;
  headline: string;
  summary: string;
  tags: string[];
  importance: 1 | 2 | 3 | 4 | 5;
};
