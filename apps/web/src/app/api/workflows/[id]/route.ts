import { getToolCatalog } from "@cogwork/connectors";
import {
  deleteWorkflow,
  getWorkflow,
  listRuns,
  listWorkflowVersions,
  updateWorkflow,
  writeAudit,
} from "@cogwork/db";
import { validateSpec } from "@cogwork/spec";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function ownedWorkflow(userId: string, id: string) {
  const wf = await getWorkflow(getDb(), id);
  if (!wf || wf.userId !== userId) return null;
  return wf;
}

export async function GET(_req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const wf = await ownedWorkflow(user.id, id);
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const db = getDb();
  const [versions, runs] = await Promise.all([
    listWorkflowVersions(db, id),
    listRuns(db, id),
  ]);
  return NextResponse.json({ workflow: wf, versions, runs });
}

const Patch = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["draft", "active", "paused"]).optional(),
  spec: z.unknown().optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const wf = await ownedWorkflow(user.id, id);
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const patch: Parameters<typeof updateWorkflow>[2] = {};
  if (parsed.data.name) patch.name = parsed.data.name;
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.spec !== undefined) {
    const v = validateSpec(parsed.data.spec, getToolCatalog());
    if (!v.ok) return NextResponse.json({ error: "Invalid spec", errors: v.errors }, { status: 400 });
    patch.spec = v.spec!;
    patch.triggerType = v.spec!.trigger.type;
    patch.scheduleCron = v.spec!.trigger.type === "schedule" ? v.spec!.trigger.cron : null;
    patch.timezone = v.spec!.trigger.type === "schedule" ? v.spec!.trigger.timezone : null;
    patch.webhookPath = v.spec!.trigger.type === "webhook" ? v.spec!.trigger.path : null;
  }
  const updated = await updateWorkflow(getDb(), id, patch);
  return NextResponse.json({ workflow: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const wf = await ownedWorkflow(user.id, id);
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const db = getDb();
  await deleteWorkflow(db, id);
  await writeAudit(db, {
    userId: user.id,
    action: "workflow.delete",
    entity: "workflow",
    entityId: id,
    metadata: { name: wf.name },
  });
  return NextResponse.json({ ok: true });
}
