import { listPendingApprovals } from "@cogwork/db";
import { NextResponse } from "next/server";
import { getDb, isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const approvals = await listPendingApprovals(getDb(), user.id);
  return NextResponse.json({ approvals });
}
