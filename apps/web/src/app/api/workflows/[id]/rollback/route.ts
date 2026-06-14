import {
  getWorkflow,
  listWorkflowVersions,
  saveWorkflowVersion,
  updateWorkflow,
  writeAudit,
} from "@cogwork/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";

const Body = z.object({ version: z.number().int() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const db = getDb();
  const wf = await getWorkflow(db, id);
  if (!wf || wf.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "version required" }, { status: 400 });

  const versions = await listWorkflowVersions(db, id);
  const target = versions.find((v) => v.version === parsed.data.version);
  if (!target) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const spec = target.spec;
  const newVersion = wf.version + 1;
  const updated = await updateWorkflow(db, id, {
    spec,
    version: newVersion,
    triggerType: spec.trigger.type,
    scheduleCron: spec.trigger.type === "schedule" ? spec.trigger.cron : null,
    timezone: spec.trigger.type === "schedule" ? spec.trigger.timezone : null,
    webhookPath: spec.trigger.type === "webhook" ? spec.trigger.path : null,
  });
  await saveWorkflowVersion(db, {
    workflowId: id,
    version: newVersion,
    spec,
    note: `rollback to v${parsed.data.version}`,
  });
  await writeAudit(db, {
    userId: user.id,
    action: "workflow.rollback",
    entity: "workflow",
    entityId: id,
    metadata: { to: parsed.data.version, newVersion },
  });
  return NextResponse.json({ workflow: updated });
}
