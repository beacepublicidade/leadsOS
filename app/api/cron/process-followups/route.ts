export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { processPendingFollowUps } from "@/services/followUpService";

/**
 * GET /api/cron/process-followups
 * Chamado pelo Vercel Cron a cada minuto.
 * Protegido por CRON_SECRET para evitar chamadas não autorizadas.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await processPendingFollowUps();
    return NextResponse.json({ success: true, processed: count });
  } catch (err) {
    console.error("[cron/process-followups]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
