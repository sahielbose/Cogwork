import { generateCode } from "@cogwork/builder";
import { getWorkflow } from "@cogwork/db";
import { NextResponse } from "next/server";
import { getDb, isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Read-only TypeScript export of a workflow (COGWORK_CONTEXT.md §9 codegen). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const wf = await getWorkflow(getDb(), id);
  if (!wf || wf.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const code = generateCode(wf.spec);
  const filename = `${wf.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.workflow.ts`;
  return new NextResponse(code, {
    headers: {
      "content-type": "text/typescript; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
