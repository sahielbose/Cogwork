import { compileWorkflow } from "@cogwork/builder";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, isResponse, requireUser } from "@/lib/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({ prompt: z.string().min(1) });

export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY isn't set. Add it to .env to generate workflows — it's the one key Cogwork needs.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await compileWorkflow({
      prompt: parsed.data.prompt,
      userId: user.id,
      db: getDb(),
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 500 },
    );
  }
}
