"use client";

import type { WorkflowSpec } from "@cogwork/spec";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FlowCanvas } from "@/components/flow/canvas";
import { specToFlow } from "@/components/flow/spec-to-flow";
import { Badge, statusToBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDuration, timeAgo } from "@/lib/utils";

interface Version {
  version: number;
  note: string | null;
  createdAt: string | Date;
  spec: WorkflowSpec;
}
interface Run {
  id: string;
  status: string;
  durationMs: number | null;
  createdAt: string | Date;
  triggerSource: string;
}
export interface SideEffectStep {
  id: string;
  tool: string;
  approval: "required" | "auto";
}
export interface WorkflowDetailData {
  id: string;
  name: string;
  status: string;
  triggerType: string;
  scheduleCron: string | null;
  version: number;
  spec: WorkflowSpec;
}

const TABS = ["Overview", "Runs", "Versions", "Settings"] as const;
type Tab = (typeof TABS)[number];

function triggerLabel(spec: WorkflowSpec): string {
  const t = spec.trigger;
  if (t.type === "schedule") return `Schedule · ${t.cron}`;
  if (t.type === "webhook") return `Webhook · /${t.path}`;
  return "Manual";
}

function diffVsCurrent(older: WorkflowSpec, current: WorkflowSpec) {
  const olderIds = new Set(older.steps.map((s) => s.id));
  const currentIds = new Set(current.steps.map((s) => s.id));
  const added = current.steps.filter((s) => !olderIds.has(s.id)).map((s) => s.id);
  const removed = older.steps.filter((s) => !currentIds.has(s.id)).map((s) => s.id);
  const changed = current.steps
    .filter(
      (s) =>
        olderIds.has(s.id) &&
        JSON.stringify(s) !== JSON.stringify(older.steps.find((o) => o.id === s.id)),
    )
    .map((s) => s.id);
  const triggerChanged = JSON.stringify(older.trigger) !== JSON.stringify(current.trigger);
  return { added, removed, changed, triggerChanged };
}

export function WorkflowDetail({
  workflow,
  versions,
  runs,
  summary,
  sideEffectSteps,
}: {
  workflow: WorkflowDetailData;
  versions: Version[];
  runs: Run[];
  summary: string;
  sideEffectSteps: SideEffectStep[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Overview");
  const [name, setName] = useState(workflow.name);
  const [busy, setBusy] = useState(false);
  const [openDiff, setOpenDiff] = useState<number | null>(null);
  const [approvals, setApprovals] = useState<Record<string, "required" | "auto">>(
    Object.fromEntries(sideEffectSteps.map((s) => [s.id, s.approval])),
  );
  const flow = useMemo(() => specToFlow(workflow.spec), [workflow.spec]);
  const badge = statusToBadge(workflow.status);

  async function call(path: string, method = "POST", body?: unknown) {
    setBusy(true);
    try {
      await fetch(path, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function setApproval(stepId: string, value: "required" | "auto") {
    setApprovals((a) => ({ ...a, [stepId]: value }));
    const spec: WorkflowSpec = {
      ...workflow.spec,
      steps: workflow.spec.steps.map((s) => (s.id === stepId ? { ...s, approval: value } : s)),
    };
    await call(`/api/workflows/${workflow.id}`, "PATCH", { spec });
  }

  return (
    <div className="mx-auto max-w-app p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-display text-xl font-semibold">{workflow.name}</h2>
          <Badge kind={badge.kind}>{badge.label}</Badge>
          <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">
            {triggerLabel(workflow.spec)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => call(`/api/workflows/${workflow.id}/run`)}>
            Run
          </Button>
          {workflow.status === "active" ? (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => call(`/api/workflows/${workflow.id}/pause`)}>
              Pause
            </Button>
          ) : (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => call(`/api/workflows/${workflow.id}/activate`)}>
              Activate
            </Button>
          )}
          <Link href={`/builder?id=${workflow.id}`}>
            <Button size="sm" variant="ghost">Open in Builder</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-md px-4 py-2 text-sm ${tab === t ? "border-b-2 border-violet font-medium text-violet" : "text-muted hover:bg-paper-3"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="text-xs font-semibold text-ink-soft mb-2">Summary</div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-ink-soft">{summary}</pre>
            <div className="mt-4 text-xs font-semibold text-ink-soft">Trigger &amp; schedule</div>
            <p className="mt-1 text-sm text-muted">
              {workflow.spec.trigger.type === "schedule"
                ? `Runs on cron "${workflow.spec.trigger.cron}" (${workflow.spec.trigger.timezone}).`
                : workflow.spec.trigger.type === "webhook"
                  ? `Runs when POSTed to /api/hooks/${workflow.spec.trigger.path}.`
                  : "Runs manually when you trigger it."}
            </p>
          </Card>
          <Card className="overflow-hidden">
            <div className="h-72 dotted-grid">
              <FlowCanvas nodes={flow.nodes} edges={flow.edges} interactive={false} />
            </div>
          </Card>
        </div>
      )}

      {tab === "Runs" && (
        <Card className="divide-y divide-line">
          {runs.length === 0 ? (
            <div className="p-8 text-center text-muted">No runs yet.</div>
          ) : (
            runs.map((r) => {
              const b = statusToBadge(r.status);
              return (
                <Link key={r.id} href={`/runs/${r.id}`} className="flex items-center gap-3 p-4 hover:bg-paper-3">
                  <span className="font-mono text-xs text-subtle">#{r.id.slice(0, 8)}</span>
                  <span className="text-sm">{r.triggerSource}</span>
                  <span className="flex-1" />
                  <span className="text-xs text-muted" suppressHydrationWarning>
                    {timeAgo(r.createdAt)}
                  </span>
                  <span className="font-mono text-xs text-muted">{formatDuration(r.durationMs)}</span>
                  <Badge kind={b.kind}>{b.label}</Badge>
                </Link>
              );
            })
          )}
        </Card>
      )}

      {tab === "Versions" && (
        <Card className="divide-y divide-line">
          {versions.length === 0 ? (
            <div className="p-8 text-center text-muted">No versions yet.</div>
          ) : (
            versions.map((v) => {
              const d = v.version === workflow.version ? null : diffVsCurrent(v.spec, workflow.spec);
              const isOpen = openDiff === v.version;
              return (
                <div key={v.version} className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">v{v.version}</span>
                    <span className="text-sm text-muted flex-1">{v.note ?? ""}</span>
                    <span className="text-xs text-subtle" suppressHydrationWarning>
                      {timeAgo(v.createdAt)}
                    </span>
                    {v.version === workflow.version ? (
                      <Badge kind="live">current</Badge>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setOpenDiff(isOpen ? null : v.version)}
                        >
                          {isOpen ? "Hide diff" : "Diff"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => call(`/api/workflows/${workflow.id}/rollback`, "POST", { version: v.version })}
                        >
                          Roll back
                        </Button>
                      </>
                    )}
                  </div>
                  {isOpen && d && (
                    <div className="mt-3 rounded-md bg-paper-2 p-3 text-xs text-ink-soft">
                      <div className="mb-1 font-semibold text-muted">Changes from v{v.version} → current:</div>
                      {d.triggerChanged && <div>• trigger changed</div>}
                      {d.added.map((id) => (
                        <div key={`a${id}`} className="text-green">+ step {id}</div>
                      ))}
                      {d.removed.map((id) => (
                        <div key={`r${id}`} className="text-red">− step {id}</div>
                      ))}
                      {d.changed.map((id) => (
                        <div key={`c${id}`}>~ step {id} changed</div>
                      ))}
                      {!d.triggerChanged && !d.added.length && !d.removed.length && !d.changed.length && (
                        <div className="text-muted">Identical to current.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </Card>
      )}

      {tab === "Settings" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="text-xs font-semibold text-ink-soft mb-2">Rename</div>
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
              <Button size="sm" variant="secondary" disabled={busy || name === workflow.name} onClick={() => call(`/api/workflows/${workflow.id}`, "PATCH", { name })}>
                Save
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-xs font-semibold text-ink-soft mb-1">Approval whitelist</div>
            <p className="mb-3 text-xs text-muted">
              Side-effecting steps pause for approval by default. Set a step to auto to let it run
              without approval.
            </p>
            {sideEffectSteps.length === 0 ? (
              <p className="text-sm text-muted">This workflow has no side-effecting steps.</p>
            ) : (
              <div className="divide-y divide-line">
                {sideEffectSteps.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2.5">
                    <span className="font-mono text-xs text-ink-soft">{s.id}</span>
                    <span className="font-mono text-[11px] text-muted">{s.tool}</span>
                    <span className="flex-1" />
                    {(["required", "auto"] as const).map((val) => (
                      <button
                        key={val}
                        disabled={busy}
                        onClick={() => setApproval(s.id, val)}
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          (approvals[s.id] ?? "required") === val
                            ? val === "required"
                              ? "bg-amber-tint text-amber"
                              : "bg-green-tint text-green"
                            : "bg-paper-3 text-muted hover:bg-line"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="text-xs font-semibold text-ink-soft mb-2">Export</div>
            <a href={`/api/workflows/${workflow.id}/export`}>
              <Button size="sm" variant="secondary">Download TypeScript</Button>
            </a>
          </Card>

          <Card className="border-red/40 p-5">
            <div className="text-xs font-semibold text-red mb-2">Danger zone</div>
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={async () => {
                if (!confirm("Delete this workflow? This cannot be undone.")) return;
                await fetch(`/api/workflows/${workflow.id}`, { method: "DELETE" });
                router.push("/app");
              }}
            >
              Delete workflow
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
