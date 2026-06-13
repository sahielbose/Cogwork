import { listPendingApprovals } from "@cogwork/db";
import { Card } from "@/components/ui/card";
import { ApprovalActions } from "@/components/studio/approval-actions";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/server";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const user = await currentUser();
  const pending = await listPendingApprovals(getDb(), user!.id);

  return (
    <div className="mx-auto max-w-app p-6 space-y-4">
      {pending.length === 0 ? (
        <Card className="p-10 text-center text-muted">Nothing waiting on you.</Card>
      ) : (
        pending.map((p) => {
          const preview = (p.approval.preview ?? {}) as { tool?: string; params?: Record<string, unknown> };
          return (
            <Card key={p.approval.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-muted">
                    {p.workflowName} · step <span className="font-mono">{p.approval.stepId}</span>
                    {p.approval.itemIndex > 0 ? ` #${p.approval.itemIndex}` : ""}
                  </div>
                  <div className="mt-1 font-medium text-ink">
                    {preview.tool ?? "side-effect"} needs your approval
                  </div>
                  <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-paper-3 p-3 font-mono text-[12px] text-ink-soft">
                    {JSON.stringify(preview.params ?? {}, null, 2)}
                  </pre>
                  <div className="mt-2 text-xs text-subtle">
                    requested {timeAgo(p.approval.requestedAt)}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <ApprovalActions approvalId={p.approval.id} runId={p.runId} />
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
