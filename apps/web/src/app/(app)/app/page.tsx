import { listRecentRuns, listWorkflows } from "@cogwork/db";
import Link from "next/link";
import { Badge, statusToBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RunButton } from "@/components/studio/run-button";
import { StatusToggle } from "@/components/studio/status-toggle";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/server";
import { formatDuration, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await currentUser();
  const db = getDb();
  const [allWorkflows, recent] = await Promise.all([
    listWorkflows(db, user!.id),
    listRecentRuns(db, user!.id, 50),
  ]);
  const query = (q ?? "").trim().toLowerCase();
  const workflows = query
    ? allWorkflows.filter((w) => w.name.toLowerCase().includes(query))
    : allWorkflows;

  const active = allWorkflows.filter((w) => w.status === "active").length;
  const weekAgo = Date.now() - 7 * 86400_000;
  const runs7d = recent.filter((r) => new Date(r.run.createdAt).getTime() > weekAgo);
  const succeeded = runs7d.filter((r) => r.run.status === "succeeded").length;
  const successRate = runs7d.length ? Math.round((succeeded / runs7d.length) * 100) : 0;
  const spend = runs7d.reduce((s, r) => s + Number(r.run.costUsd ?? 0), 0);

  return (
    <div className="mx-auto max-w-app p-6 space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Active workflows" value={String(active)} />
        <Stat label="Runs (7d)" value={String(runs7d.length)} />
        <Stat label="Success rate" value={`${successRate}%`} />
        <Stat label="Spend (7d)" value={`$${spend.toFixed(3)}`} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Your workflows</h2>
          <Link href="/builder">
            <Button size="sm">+ New workflow</Button>
          </Link>
        </div>

        {workflows.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-muted">
              {query
                ? `No workflows match "${query}".`
                : "No workflows yet. Describe one to get started."}
            </p>
            <Link href="/builder" className="inline-block mt-4">
              <Button>Open the Builder →</Button>
            </Link>
          </Card>
        ) : (
          <Card className="divide-y divide-line">
            {workflows.map((w) => {
              const b = statusToBadge(w.status);
              return (
                <div key={w.id} className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <Link href={`/workflows/${w.id}`} className="font-medium text-ink truncate hover:text-violet">
                      {w.name}
                    </Link>
                    <div className="text-xs text-muted">
                      {w.triggerType === "schedule"
                        ? `Schedule · ${w.scheduleCron}`
                        : w.triggerType === "webhook"
                          ? "Webhook"
                          : "Manual"}
                    </div>
                  </div>
                  <Badge kind={b.kind}>{b.label}</Badge>
                  <RunButton workflowId={w.id} />
                  <StatusToggle id={w.id} status={w.status} />
                  <Link href={`/workflows/${w.id}`}>
                    <Button size="sm" variant="ghost">
                      Open
                    </Button>
                  </Link>
                </div>
              );
            })}
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Recent runs</h2>
        {recent.length === 0 ? (
          <Card className="p-8 text-center text-muted">No runs yet.</Card>
        ) : (
          <Card className="divide-y divide-line">
            {recent.slice(0, 8).map((r) => {
              const b = statusToBadge(r.run.status);
              return (
                <Link
                  key={r.run.id}
                  href={`/runs/${r.run.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-paper-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.workflowName}</div>
                    <div className="text-xs text-muted">{timeAgo(r.run.createdAt)}</div>
                  </div>
                  <span className="font-mono text-xs text-muted">
                    {formatDuration(r.run.durationMs)}
                  </span>
                  <Badge kind={b.kind}>{b.label}</Badge>
                </Link>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
