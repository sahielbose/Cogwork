import { listConnections } from "@cogwork/db";
import { NextResponse } from "next/server";
import { getDb, isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";

/**
 * List the user's connections (COGWORK_CONTEXT.md §8). Empty in fixture mode —
 * OAuth connecting (start/callback/api-key) is wired at go-live (Phase 3).
 */
export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const connections = await listConnections(getDb(), user.id);
  return NextResponse.json({ connections });
}
