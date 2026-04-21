import type { ArticleDomain, Scenario, ScenarioImplication } from "@/lib/types";

function textForScenario(scenario: Scenario) {
  return `${scenario.title} ${scenario.description} ${scenario.drivers.join(" ")}`.toLowerCase();
}

function impactedDomains(scenario: Scenario): Array<ArticleDomain | "Cross-domain"> {
  const text = textForScenario(scenario);
  const domains: Array<ArticleDomain | "Cross-domain"> = [];

  if (/(ai|model|inference|agent|openai|frontier)/.test(text)) domains.push("AI");
  if (/(chip|gpu|semiconductor|nvidia|tsmc|memory)/.test(text)) domains.push("Chips");
  if (/(data center|infrastructure|cloud|power|grid|energy)/.test(text)) domains.push("Infra");
  if (/(energy|power|grid|electricity)/.test(text)) domains.push("Energy");
  if (/(policy|rate|macro|market|capital)/.test(text)) domains.push("Macro");

  return domains.length ? domains : ["Cross-domain"];
}

export function generateImplications(scenario: Scenario): ScenarioImplication {
  const domains = impactedDomains(scenario);
  const driver = scenario.drivers[0] ?? scenario.title;
  const urgency =
    scenario.likelihood === "high"
      ? "near-term"
      : scenario.likelihood === "medium"
        ? "planning"
        : "monitoring";

  return {
    scenarioId: scenario.id,
    consequences: [
      `Prioritize ${urgency} review of decisions exposed to ${driver}.`,
      `Identify teams, suppliers, or customers most sensitive to this scenario.`,
      `Set a threshold for when this moves from observation to action.`,
    ],
    domainImpacts: domains.map((domain) => ({
      domain,
      impact:
        domain === "Cross-domain"
          ? "Watch for second-order effects across adjacent themes before committing resources."
          : `${domain} planning should account for ${scenario.timeHorizon} pressure from this scenario.`,
    })),
  };
}
