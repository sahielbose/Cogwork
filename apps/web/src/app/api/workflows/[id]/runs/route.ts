import { getWorkflow, listRuns } from "@cogwork/db";
import { NextResponse } from "next/server";
import { getDb, isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";

/** List a workflow's runs (COGWORK_CONTEXT.md §8). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const db = getDb();
  const wf = await getWorkflow(db, id);
  if (!wf || wf.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ runs: await listRuns(db, id) });
}
