import { explainSpec } from "@cogwork/builder";
import { WorkflowSpecSchema } from "@cogwork/spec";
import { NextResponse } from "next/server";
import { isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Deterministic spec → plain-English summary (COGWORK_CONTEXT.md §8). */
export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const body = await req.json().catch(() => null);
  const parsed = WorkflowSpecSchema.safeParse(body?.spec);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid spec is required." }, { status: 400 });
  }
  return NextResponse.json({ summary: explainSpec(parsed.data) });
}
