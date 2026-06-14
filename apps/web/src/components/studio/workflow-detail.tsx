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
}
interface Run {
  id: string;
  status: string;
  durationMs: number | null;
  createdAt: string | Date;
  triggerSource: string;
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

export function WorkflowDetail({
  workflow,
  versions,
  runs,
  summary,
}: {
  workflow: WorkflowDetailData;
  versions: Version[];
  runs: Run[];
  summary: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Overview");
  const [name, setName] = useState(workflow.name);
  const [busy, setBusy] = useState(false);
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

  return (
    <div className="mx-auto max-w-app p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl font-semibold">{workflow.name}</h2>
          <Badge kind={badge.kind}>{badge.label}</Badge>
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
                  <span className="text-xs text-muted">{timeAgo(r.createdAt)}</span>
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
          {versions.map((v) => (
            <div key={v.version} className="flex items-center gap-3 p-4">
              <span className="font-mono text-sm">v{v.version}</span>
              <span className="text-sm text-muted flex-1">{v.note ?? ""}</span>
              <span className="text-xs text-subtle">{timeAgo(v.createdAt)}</span>
              {v.version === workflow.version ? (
                <Badge kind="live">current</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => call(`/api/workflows/${workflow.id}/rollback`, "POST", { version: v.version })}
                >
                  Roll back
                </Button>
              )}
            </div>
          ))}
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
