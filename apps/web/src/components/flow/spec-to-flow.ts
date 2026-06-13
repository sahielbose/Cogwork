import type { WorkflowSpec } from "@cogwork/spec";
import type { Edge, Node } from "@xyflow/react";

export interface CogNodeData extends Record<string, unknown> {
  kind: "trigger" | "ai" | "tool";
  provider: string;
  title: string;
  subtitle: string;
  status?: string;
  badges: string[];
}

function triggerSubtitle(spec: WorkflowSpec): string {
  const t = spec.trigger;
  if (t.type === "schedule") return `${t.cron} · ${t.timezone}`;
  if (t.type === "webhook") return `/api/hooks/${t.path}`;
  return "Run manually";
}

/** Build a top-to-bottom flow graph from a spec, optionally with run status. */
export function specToFlow(
  spec: WorkflowSpec,
  stepStatus: Record<string, string> = {},
): { nodes: Node<CogNodeData>[]; edges: Edge[] } {
  const X = 80;
  const GAP = 150;

  const nodes: Node<CogNodeData>[] = [
    {
      id: "__trigger",
      type: "cog",
      position: { x: X, y: 0 },
      data: {
        kind: "trigger",
        provider: spec.trigger.type,
        title: spec.trigger.type === "schedule" ? "Schedule" : spec.trigger.type === "webhook" ? "Webhook" : "Manual",
        subtitle: triggerSubtitle(spec),
        badges: [],
      },
    },
  ];

  spec.steps.forEach((step, i) => {
    const provider = step.tool.split(".")[0]!;
    const verb = step.tool.split(".").slice(1).join(".").replace(/_/g, " ");
    const badges: string[] = [];
    if (step.forEach) badges.push("forEach");
    if (step.approval === "required") badges.push("approval");
    nodes.push({
      id: step.id,
      type: "cog",
      position: { x: X, y: (i + 1) * GAP },
      data: {
        kind: provider === "ai" ? "ai" : "tool",
        provider,
        title: step.tool,
        subtitle: verb,
        status: stepStatus[step.id],
        badges,
      },
    });
  });

  const edges: Edge[] = [];
  const ids = ["__trigger", ...spec.steps.map((s) => s.id)];
  for (let i = 0; i < ids.length - 1; i++) {
    const targetStatus = stepStatus[ids[i + 1]!];
    const running = targetStatus === "running";
    const done = targetStatus === "succeeded";
    edges.push({
      id: `${ids[i]}->${ids[i + 1]}`,
      source: ids[i]!,
      target: ids[i + 1]!,
      type: "smoothstep",
      animated: running,
      style: {
        stroke: done ? "var(--green)" : running ? "var(--green)" : "var(--subtle)",
        strokeWidth: 1.5,
        strokeDasharray: done ? undefined : "5 5",
      },
    });
  }

  return { nodes, edges };
}
