import type { Step, Trigger, WorkflowSpec } from "@cogwork/spec";

/**
 * Deterministic spec → plain-English summary (no LLM — free, fast, stable).
 * Used by compile and the /api/builder/explain route.
 */

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function humanizeCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return `on cron "${cron}"`;
  const [min, hour, dom, , dow] = parts as [string, string, string, string, string];
  const time =
    /^\d+$/.test(hour) && /^\d+$/.test(min)
      ? `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`
      : `cron "${cron}"`;
  if (dom === "*" && dow === "1-5") return `every weekday at ${time}`;
  if (dom === "*" && dow === "*") return `every day at ${time}`;
  if (dom === "*" && /^\d$/.test(dow)) return `every ${DOW[Number(dow)]} at ${time}`;
  return `on cron "${cron}"`;
}

function describeTrigger(t: Trigger): string {
  switch (t.type) {
    case "manual":
      return "Runs when you trigger it manually.";
    case "webhook":
      return `Runs when a request hits the webhook /api/hooks/${t.path}.`;
    case "schedule":
      return `Runs ${humanizeCron(t.cron)} (${t.timezone}).`;
  }
}

function providerLabel(provider: string): string {
  if (provider === "ai") return "AI";
  if (provider === "gcal") return "Google Calendar";
  if (provider === "github") return "GitHub";
  if (provider === "http") return "HTTP";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function describeStep(step: Step): string {
  const [provider, ...rest] = step.tool.split(".");
  const verb = rest.join(".").replace(/_/g, " ");
  let line = `${providerLabel(provider!)} — ${verb}`;
  if (step.forEach) line += ` (once per item in ${step.forEach})`;
  if (step.condition) line += ` (only if ${step.condition})`;
  if (step.approval === "required") line += " — needs your approval";
  return line;
}

export function explainSpec(spec: WorkflowSpec): string {
  const lines: string[] = [];
  lines.push(spec.name);
  if (spec.description) lines.push(spec.description);
  lines.push("");
  lines.push(describeTrigger(spec.trigger));
  lines.push("");
  spec.steps.forEach((step, i) => {
    lines.push(`${i + 1}. ${describeStep(step)}`);
  });
  return lines.join("\n");
}
