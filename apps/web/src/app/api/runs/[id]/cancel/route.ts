import { getRun, getWorkflow, setRunStatus, writeAudit } from "@cogwork/db";
import { NextResponse } from "next/server";
import { getDb, isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Cancel a run (COGWORK_CONTEXT.md §8). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const db = getDb();
  const run = await getRun(db, id);
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const wf = await getWorkflow(db, run.workflowId);
  if (!wf || wf.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await setRunStatus(db, id, "cancelled", { finishedAt: new Date() });
  await writeAudit(db, { userId: user.id, action: "run.cancel", entity: "run", entityId: id });
  return NextResponse.json({ run: updated });
}
