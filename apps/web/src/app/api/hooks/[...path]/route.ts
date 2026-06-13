import { getWorkflowByWebhookPath } from "@cogwork/db";
import { NextResponse } from "next/server";
import { startTriggeredRun } from "@/lib/runner";
import { getDb } from "@/lib/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * External webhook trigger (COGWORK_CONTEXT.md §8). Unauthenticated by design —
 * the path is unguessable; an optional shared-secret check is a go-live add-on.
 * Enqueues/runs the matching active workflow with the request body as
 * {{ trigger.payload }}.
 */
export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const webhookPath = path.join("/");
  const db = getDb();
  const wf = await getWorkflowByWebhookPath(db, webhookPath);
  if (!wf || wf.status !== "active") {
    return NextResponse.json({ error: "No active workflow for this webhook." }, { status: 404 });
  }
  const payload = await req.json().catch(() => ({}));
  const result = await startTriggeredRun(wf.id, "webhook", { payload });
  return NextResponse.json(result);
}
