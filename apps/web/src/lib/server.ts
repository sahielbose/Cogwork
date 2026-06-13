import { getDb } from "@cogwork/db";
import { NextResponse } from "next/server";
import { currentUser, type SessionUser } from "./auth";

export { getDb };

/** Route-handler auth guard. Returns the user, or a 401 NextResponse. */
export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return user;
}

export function isResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}

export const COGWORK_RUN_MODE = process.env.COGWORK_CONNECTORS === "live" ? "live" : "fixture";
