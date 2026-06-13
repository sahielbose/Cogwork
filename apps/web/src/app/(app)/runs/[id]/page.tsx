import { getRun, getRunWithSteps, getWorkflow } from "@cogwork/db";
import { notFound } from "next/navigation";
import { RunDetail, type RunData } from "@/components/studio/run-detail";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const db = getDb();
  const run = await getRun(db, id);
  if (!run) notFound();
  const wf = await getWorkflow(db, run.workflowId);
  if (!wf || wf.userId !== user!.id) notFound();
  const full = await getRunWithSteps(db, id);
  if (!full) notFound();

  return (
    <RunDetail
      run={full as unknown as RunData}
      workflow={{ id: wf.id, name: wf.name }}
    />
  );
}
