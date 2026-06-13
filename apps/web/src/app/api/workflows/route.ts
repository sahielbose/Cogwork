import { getToolCatalog } from "@cogwork/connectors";
import { createWorkflow, listWorkflows, writeAudit } from "@cogwork/db";
import { validateSpec } from "@cogwork/spec";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const workflows = await listWorkflows(getDb(), user.id);
  return NextResponse.json({ workflows });
}

const Body = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  spec: z.unknown(),
  status: z.enum(["draft", "active", "paused"]).optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const validation = validateSpec(parsed.data.spec, getToolCatalog());
  if (!validation.ok) {
    return NextResponse.json({ error: "Invalid spec", errors: validation.errors }, { status: 400 });
  }
  const spec = validation.spec!;
  const db = getDb();

  const wf = await createWorkflow(db, {
    userId: user.id,
    name: parsed.data.name ?? spec.name,
    description: parsed.data.description ?? spec.description ?? null,
    spec,
    status: parsed.data.status ?? "draft",
    triggerType: spec.trigger.type,
    scheduleCron: spec.trigger.type === "schedule" ? spec.trigger.cron : null,
    timezone: spec.trigger.type === "schedule" ? spec.trigger.timezone : null,
    webhookPath: spec.trigger.type === "webhook" ? spec.trigger.path : null,
    version: 1,
  });

  await writeAudit(db, {
    userId: user.id,
    action: "workflow.create",
    entity: "workflow",
    entityId: wf.id,
    metadata: { name: wf.name },
  });

  return NextResponse.json({ workflow: wf }, { status: 201 });
}
