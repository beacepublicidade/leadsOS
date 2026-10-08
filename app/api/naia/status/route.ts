export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "online",
    modules: ["crm", "agencia", "juridico", "financeiro"],
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
}
