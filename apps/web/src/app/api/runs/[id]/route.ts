import { getRun, getRunWithSteps, getWorkflow } from "@cogwork/db";
import { NextResponse } from "next/server";
import { getDb, isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const db = getDb();
  const run = await getRun(db, id);
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const wf = await getWorkflow(db, run.workflowId);
  if (!wf || wf.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const full = await getRunWithSteps(db, id);
  return NextResponse.json({ run: full, workflow: { id: wf.id, name: wf.name } });
}
