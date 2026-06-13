import { NextResponse } from "next/server";
import { resolveApprovalAndResume } from "@/lib/runner";
import { isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const outcome = await resolveApprovalAndResume(id, "rejected", user.id);
  if ("error" in outcome) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(outcome);
}
