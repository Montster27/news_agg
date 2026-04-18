import { Article, ArticleDomain } from "@/lib/types";

export const articles: Article[] = [
  {
    id: "a1",
    date: "2026-04-18",
    domain: "AI",
    headline: "Hyperscalers lock in another wave of GPU cluster leases",
    summary:
      "Cloud buyers are committing to multi-year capacity blocks instead of spot expansion. That points to sustained demand for inference infrastructure even as model pricing falls.",
    tags: ["gpu", "cloud", "inference", "capacity"],
    importance: 5,
  },
  {
    id: "a2",
    date: "2026-04-18",
    domain: "AI",
    headline: "Enterprise copilots shift toward smaller specialized models",
    summary:
      "Teams are moving latency-sensitive workloads to narrower model stacks with custom retrieval. The pattern suggests budget pressure is pushing AI software toward more targeted deployments.",
    tags: ["models", "enterprise", "copilots", "efficiency"],
    importance: 4,
  },
  {
    id: "a3",
    date: "2026-04-18",
    domain: "Chips",
    headline: "HBM supply stays tight as memory vendors prioritize premium stacks",
    summary:
      "Memory makers are steering advanced packaging capacity toward higher-margin HBM programs. That keeps pressure on accelerator roadmaps that depend on predictable memory availability.",
    tags: ["hbm", "memory", "packaging", "supply"],
    importance: 5,
  },
  {
    id: "a4",
    date: "2026-04-18",
    domain: "Chips",
    headline: "Startups pitching NVIDIA alternatives gain traction with inference buyers",
    summary:
      "More procurement teams are testing accelerators that trade absolute performance for lower cost and power draw. The shift matters because inference economics increasingly drive deployment decisions.",
    tags: ["nvidia-alternatives", "inference", "accelerators", "cost"],
    importance: 4,
  },
  {
    id: "a5",
    date: "2026-04-18",
    domain: "Infra",
    headline: "Secondary data center markets absorb new AI buildouts",
    summary:
      "Developers are targeting regions with cheaper land and faster permitting rather than defaulting to legacy hubs. That broadens where compute clusters can go but raises transmission and staffing questions.",
    tags: ["data-centers", "power", "real-estate", "ai-buildout"],
    importance: 5,
  },
  {
    id: "a6",
    date: "2026-04-18",
    domain: "Infra",
    headline: "Liquid cooling suppliers report longer lead times",
    summary:
      "Cooling vendors are seeing backlog growth as rack densities rise above traditional thresholds. The bottleneck is becoming part of deployment planning rather than a later facility upgrade.",
    tags: ["cooling", "data-centers", "thermal", "supply"],
    importance: 4,
  },
  {
    id: "a7",
    date: "2026-04-18",
    domain: "Energy",
    headline: "Utilities pilot dedicated tariffs for AI campuses",
    summary:
      "New tariff structures are being designed to secure large industrial loads without destabilizing nearby demand. That indicates power procurement is becoming a strategic differentiator for compute operators.",
    tags: ["energy", "utilities", "data-centers", "power"],
    importance: 5,
  },
  {
    id: "a8",
    date: "2026-04-18",
    domain: "Energy",
    headline: "Grid-scale battery projects pivot toward shorter construction cycles",
    summary:
      "Developers are favoring battery configurations that can come online quickly beside new industrial loads. This reduces time-to-power for compute campuses but may limit duration flexibility.",
    tags: ["batteries", "grid", "energy", "deployment"],
    importance: 4,
  },
  {
    id: "a9",
    date: "2026-04-18",
    domain: "Bio",
    headline: "Graphene membrane startups pitch data center water savings",
    summary:
      "New filtration systems aim to recycle cooling water with less pressure and chemical treatment. The pitch connects frontier materials research to a very practical infrastructure pain point.",
    tags: ["graphene", "water", "cooling", "materials"],
    importance: 3,
  },
  {
    id: "a10",
    date: "2026-04-18",
    domain: "Bio",
    headline: "Synthetic biology tooling adopts AI-native lab automation stacks",
    summary:
      "Lab platforms are bundling model-guided experiment planning with robotic execution. The result is a tighter loop between compute investment and scientific throughput.",
    tags: ["bio", "automation", "ai", "labs"],
    importance: 3,
  },
  {
    id: "a11",
    date: "2026-04-18",
    domain: "Macro",
    headline: "Capital markets reward companies with visible compute discipline",
    summary:
      "Investors are treating AI spending more like capex than narrative growth when returns are unclear. That is pressuring operators to show utilization and margin logic early.",
    tags: ["macro", "capex", "markets", "efficiency"],
    importance: 4,
  },
  {
    id: "a12",
    date: "2026-04-18",
    domain: "Macro",
    headline: "Trade frictions keep advanced packaging in focus",
    summary:
      "Packaging and substrate exposure remain central to geopolitical risk analysis across semis. Procurement teams are increasingly tracking regional dependencies beyond the fab layer.",
    tags: ["macro", "packaging", "trade", "supply"],
    importance: 4,
  },
  {
    id: "a13",
    date: "2026-04-18",
    domain: "AI",
    headline: "Inference observability tools become a standard budget line",
    summary:
      "Teams are spending more to monitor token efficiency, latency, and cache hit rates across production apps. That signals AI operations is maturing into a distinct software layer.",
    tags: ["observability", "inference", "efficiency", "software"],
    importance: 3,
  },
  {
    id: "a14",
    date: "2026-04-18",
    domain: "Chips",
    headline: "Silicon photonics resurfaces in interconnect roadmaps",
    summary:
      "Vendors are revisiting optical links as clusters scale beyond traditional copper comfort zones. Faster interconnect strategy is becoming essential as compute density rises.",
    tags: ["interconnect", "silicon-photonics", "clusters", "networking"],
    importance: 3,
  },
  {
    id: "a15",
    date: "2026-04-18",
    domain: "Infra",
    headline: "Modular substations shorten time to energize new campuses",
    summary:
      "Prefabricated electrical infrastructure is reducing construction risk for large compute deployments. That makes power delivery an increasingly productized layer of AI infrastructure.",
    tags: ["power", "substations", "deployment", "data-centers"],
    importance: 4,
  },
  {
    id: "a16",
    date: "2026-04-18",
    domain: "Energy",
    headline: "Sodium-ion battery pilots target backup power economics",
    summary:
      "Operators are exploring chemistries that reduce dependence on constrained lithium supply chains. These systems are not yet dominant, but they are expanding the design space for resilient campuses.",
    tags: ["batteries", "backup-power", "sodium-ion", "supply"],
    importance: 3,
  },
  {
    id: "a17",
    date: "2026-04-18",
    domain: "Bio",
    headline: "Graphene-enhanced thermal materials move closer to server packaging",
    summary:
      "Component suppliers are testing graphene composites for heat spreaders and interface materials. If validated at scale, they could improve cooling efficiency without major rack redesigns.",
    tags: ["graphene", "thermal", "materials", "servers"],
    importance: 4,
  },
  {
    id: "a18",
    date: "2026-04-18",
    domain: "Macro",
    headline: "Debt markets reopen for large digital infrastructure deals",
    summary:
      "Financing conditions are improving for projects with contracted demand and clear utility access. That favors operators who can prove long-duration workloads and disciplined site planning.",
    tags: ["macro", "financing", "data-centers", "infrastructure"],
    importance: 3,
  },
];

export const categoryGroups = [
  { title: "AI", domains: ["AI"] },
  { title: "Chips", domains: ["Chips"] },
  { title: "Infra", domains: ["Infra"] },
  { title: "Frontier Tech", domains: ["Bio", "Energy"] },
  { title: "Macro", domains: ["Macro"] },
] satisfies { title: string; domains: ArticleDomain[] }[];
