import { getWorkflow, setWorkflowStatus, writeAudit } from "@cogwork/db";
import { NextResponse } from "next/server";
import { getDb, isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const db = getDb();
  const wf = await getWorkflow(db, id);
  if (!wf || wf.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await setWorkflowStatus(db, id, "paused");
  await writeAudit(db, { userId: user.id, action: "workflow.pause", entity: "workflow", entityId: id });
  return NextResponse.json({ workflow: updated });
}
