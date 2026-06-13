import { getConnectorRegistry } from "@cogwork/connectors";
import { NextResponse } from "next/server";
import { COGWORK_RUN_MODE } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    runMode: COGWORK_RUN_MODE,
    connectors: getConnectorRegistry(),
  });
}
