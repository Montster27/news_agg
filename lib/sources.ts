import { ArticleDomain } from "@/lib/types";

export type RssSource = {
  name: string;
  url: string;
  category: ArticleDomain;
};

export const sources: RssSource[] = [
  {
    name: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
    category: "AI",
  },
  {
    name: "Wired",
    url: "https://www.wired.com/feed/rss",
    category: "Macro",
  },
  {
    name: "Slashdot",
    url: "http://rss.slashdot.org/Slashdot/slashdotMain",
    category: "General",
  },
  {
    name: "OpenAI Blog",
    url: "https://openai.com/blog/rss.xml",
    category: "AI",
  },
  {
    name: "DeepMind",
    url: "https://www.deepmind.com/blog/rss.xml",
    category: "AI",
  },
  {
    name: "Arxiv AI",
    url: "http://export.arxiv.org/rss/cs.AI",
    category: "AI",
  },
  {
    name: "Semiconductor Engineering",
    url: "https://semiengineering.com/feed/",
    category: "Chips",
  },
  {
    name: "AnandTech",
    url: "https://www.anandtech.com/rss/",
    category: "Chips",
  },
  {
    name: "Data Center Knowledge",
    url: "https://www.datacenterknowledge.com/rss.xml",
    category: "Infra",
  },
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    category: "Macro",
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    category: "Macro",
  },
  {
    name: "Techmeme",
    url: "https://www.techmeme.com/feed.xml",
    category: "Macro",
  },
  {
    name: "Reuters Tech",
    url: "https://www.reutersagency.com/feed/?best-topics=technology",
    category: "Macro",
  },
  {
    name: "Nature Biotechnology",
    url: "https://www.nature.com/nbt.rss",
    category: "Bio",
  },
  {
    name: "Science Daily Tech",
    url: "https://www.sciencedaily.com/rss/computers_math/technology.xml",
    category: "Frontier",
  },
];
