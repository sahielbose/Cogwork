import { getRun, getWorkflow, writeAudit } from "@cogwork/db";
import { NextResponse } from "next/server";
import { resumeRun } from "@/lib/runner";
import { getDb, isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Retry a run from the last good step (COGWORK_CONTEXT.md §8). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const db = getDb();
  const run = await getRun(db, id);
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const wf = await getWorkflow(db, run.workflowId);
  if (!wf || wf.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await resumeRun(id);
  await writeAudit(db, { userId: user.id, action: "run.retry", entity: "run", entityId: id });
  return NextResponse.json({ runId: id, ...result });
}
