import { deletePreference, setPreference, writeAudit } from "@cogwork/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";

const Body = z.object({ value: z.unknown() });

export async function PUT(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { key } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "value required" }, { status: 400 });
  const db = getDb();
  const pref = await setPreference(db, user.id, key, parsed.data.value);
  await writeAudit(db, { userId: user.id, action: "preference.set", entity: "preference", entityId: null, metadata: { key } });
  return NextResponse.json({ preference: pref });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { key } = await params;
  await deletePreference(getDb(), user.id, key);
  return NextResponse.json({ ok: true });
}
