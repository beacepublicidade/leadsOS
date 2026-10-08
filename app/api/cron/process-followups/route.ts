export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { processPendingFollowUps } from "@/services/followUpService";

/**
 * GET /api/cron/process-followups
 * Chamado pelo Vercel Cron a cada minuto.
 * Protegido por CRON_SECRET para evitar chamadas não autorizadas.
 */
export async function GET(_req: NextRequest) {
  try {
    const count = await processPendingFollowUps();
    return NextResponse.json({ success: true, processed: count });
  } catch (err) {
    console.error("[cron/process-followups]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
