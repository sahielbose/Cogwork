import { getToolCatalog } from "@cogwork/connectors";
import { createWorkflow, writeAudit } from "@cogwork/db";
import { validateSpec } from "@cogwork/spec";
import { NextResponse } from "next/server";
import { getDb, isResponse, requireUser } from "@/lib/server";
import { getTemplate } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const tpl = getTemplate(id);
  if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const v = validateSpec(tpl.spec, getToolCatalog());
  if (!v.ok) return NextResponse.json({ error: "Template spec invalid", errors: v.errors }, { status: 500 });
  const spec = v.spec!;
  const db = getDb();

  const wf = await createWorkflow(db, {
    userId: user.id,
    name: tpl.name,
    description: tpl.description,
    spec,
    status: "draft",
    triggerType: spec.trigger.type,
    scheduleCron: spec.trigger.type === "schedule" ? spec.trigger.cron : null,
    timezone: spec.trigger.type === "schedule" ? spec.trigger.timezone : null,
    webhookPath: spec.trigger.type === "webhook" ? `${spec.trigger.path}-${Date.now()}` : null,
    version: 1,
  });
  await writeAudit(db, {
    userId: user.id,
    action: "template.clone",
    entity: "workflow",
    entityId: wf.id,
    metadata: { templateId: id },
  });
  return NextResponse.json({ workflowId: wf.id }, { status: 201 });
}
