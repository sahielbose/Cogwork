import { explainSpec } from "@cogwork/builder";
import { getWorkflow, listRuns, listWorkflowVersions } from "@cogwork/db";
import { notFound } from "next/navigation";
import { WorkflowDetail, type WorkflowDetailData } from "@/components/studio/workflow-detail";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const db = getDb();
  const wf = await getWorkflow(db, id);
  if (!wf || wf.userId !== user!.id) notFound();
  const [versions, runs] = await Promise.all([listWorkflowVersions(db, id), listRuns(db, id)]);

  return (
    <WorkflowDetail
      workflow={wf as unknown as WorkflowDetailData}
      summary={explainSpec(wf.spec)}
      versions={versions.map((v) => ({ version: v.version, note: v.note, createdAt: v.createdAt }))}
      runs={runs.map((r) => ({
        id: r.id,
        status: r.status,
        durationMs: r.durationMs,
        createdAt: r.createdAt,
        triggerSource: r.triggerSource,
      }))}
    />
  );
}
