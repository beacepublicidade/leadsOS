export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { processTriggers }          from "@/services/triggersService";
import { processEmailRemarketing }  from "@/services/remarketingService";

/**
 * GET /api/cron/process-triggers
 * Chamado pelo Vercel Cron a cada hora.
 * Protegido por CRON_SECRET.
 */
export async function GET(_req: NextRequest) {
  try {
    const [triggers, emailsSent] = await Promise.all([
      processTriggers(),
      processEmailRemarketing(),
    ]);
    return NextResponse.json({ success: true, ...triggers, emailsSent });
  } catch (err) {
    console.error("[cron/process-triggers]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
