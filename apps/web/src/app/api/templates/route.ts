import { NextResponse } from "next/server";
import { TEMPLATES } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    templates: TEMPLATES.map(({ id, name, description, category, integrations, prompt }) => ({
      id,
      name,
      description,
      category,
      integrations,
      prompt,
    })),
  });
}
