import { getWorkflow, writeAudit } from "@cogwork/db";
import { NextResponse } from "next/server";
import { startManualRun } from "@/lib/runner";
import { getDb, isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const db = getDb();
  const wf = await getWorkflow(db, id);
  if (!wf || wf.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const result = await startManualRun(id);
  await writeAudit(db, {
    userId: user.id,
    action: "run.start",
    entity: "run",
    entityId: result.runId,
    metadata: { workflowId: id, trigger: "manual" },
  });
  return NextResponse.json(result);
}
