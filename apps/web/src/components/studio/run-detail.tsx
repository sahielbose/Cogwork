"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, statusToBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ApprovalActions } from "@/components/studio/approval-actions";
import { formatDuration } from "@/lib/utils";

interface Step {
  id: string;
  stepId: string;
  itemIndex: number;
  tool: string;
  status: string;
  input: unknown;
  output: unknown;
  error: string | null;
  attempt: number;
  startedAt: string | Date | null;
  finishedAt: string | Date | null;
}
interface Approval {
  id: string;
  stepId: string;
  itemIndex: number;
  status: string;
}
export interface RunData {
  id: string;
  status: string;
  triggerSource: string;
  durationMs: number | null;
  tokenInput: number;
  tokenOutput: number;
  costUsd: string;
  error: string | null;
  steps: Step[];
  approvals: Approval[];
}

function stepDuration(s: Step): number | null {
  if (!s.startedAt || !s.finishedAt) return null;
  return new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime();
}

export function RunDetail({
  run,
  workflow,
}: {
  run: RunData;
  workflow: { id: string; name: string };
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const headBadge = statusToBadge(run.status);
  const tokens = run.tokenInput + run.tokenOutput;

  const steps = [...run.steps].sort((a, b) => {
    const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return a.itemIndex - b.itemIndex;
  });

  return (
    <div className="mx-auto max-w-app p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/app" className="text-xs text-violet hover:underline">
            ← Dashboard
          </Link>
          <h2 className="font-display text-xl font-semibold mt-1">
            {workflow.name}{" "}
            <span className="font-mono text-sm text-muted">#{run.id.slice(0, 8)}</span>
          </h2>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-muted">
          <Badge kind={headBadge.kind}>{headBadge.label}</Badge>
          <span>{formatDuration(run.durationMs)}</span>
          <span>{tokens.toLocaleString()} tok</span>
          <span>${Number(run.costUsd).toFixed(4)}</span>
        </div>
      </div>

      {run.error && (
        <Card className="border-red bg-red-tint p-4 text-sm text-ink-soft">
          <strong className="text-red">Run failed.</strong> {run.error}{" "}
          <Link href={`/builder?id=${workflow.id}`} className="text-violet hover:underline">
            Open in Builder to fix it →
          </Link>
        </Card>
      )}

      <Card className="divide-y divide-line">
        {steps.map((s, i) => {
          const b = statusToBadge(s.status);
          const dur = stepDuration(s);
          const key = `${s.stepId}:${s.itemIndex}`;
          const isOpen = open[key];
          const approval = run.approvals.find(
            (a) => a.stepId === s.stepId && a.itemIndex === s.itemIndex && a.status === "pending",
          );
          return (
            <div key={s.id}>
              <button
                onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-paper-3"
              >
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="font-mono text-xs text-subtle w-6">[{i + 1}]</span>
                <span className="font-medium text-sm">
                  {s.stepId}
                  {s.itemIndex > 0 ? ` #${s.itemIndex}` : ""}
                </span>
                <span className="font-mono text-xs text-muted">{s.tool}</span>
                <span className="flex-1" />
                {dur != null && (
                  <span className="rounded-full bg-green-tint px-2 py-0.5 font-mono text-[11px] text-green">
                    {formatDuration(dur)}
                  </span>
                )}
                <Badge kind={b.kind}>{b.label}</Badge>
              </button>

              {approval && (
                <div className="flex items-center justify-between gap-3 border-t border-line bg-amber-tint/40 px-4 py-3">
                  <span className="text-sm text-ink-soft">This step is waiting for your approval.</span>
                  <ApprovalActions approvalId={approval.id} runId={run.id} />
                </div>
              )}

              {isOpen && (
                <div className="grid gap-3 border-t border-line bg-paper-2 p-4 md:grid-cols-2">
                  <IoBlock label="Input" value={s.input} />
                  <IoBlock label="Output" value={s.error ? { error: s.error } : s.output} />
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function IoBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <div className="text-xs font-semibold text-ink-soft mb-1">{label}</div>
      <pre className="max-h-64 overflow-auto rounded-md bg-paper-3 p-3 font-mono text-[12px] text-ink-soft">
        {value == null ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
