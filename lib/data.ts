import { Article, ArticleDomain } from "@/lib/types";

export const dashboardGroups = [
  { title: "AI", domains: ["AI"] },
  { title: "Chips", domains: ["Chips"] },
  { title: "Infra", domains: ["Infra"] },
  { title: "Frontier Tech", domains: ["Bio", "Energy", "Frontier"] },
  { title: "Macro", domains: ["Macro", "General"] },
] satisfies { title: string; domains: ArticleDomain[] }[];

export const fallbackArticles: Article[] = [];
