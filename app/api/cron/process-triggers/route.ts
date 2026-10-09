export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { processTriggers }          from "@/services/triggersService";
import { processEmailRemarketing }  from "@/services/remarketingService";
import { dispatchSDR }              from "@/services/sdrDispatchService";
import { supabaseAdmin }            from "@/lib/supabase-admin";

/**
 * GET /api/cron/process-triggers
 * Chamado pelo Vercel Cron a cada hora.
 * Protegido por CRON_SECRET.
 */
export async function GET(_req: NextRequest) {
  try {
    // ── Auto-dispatch leads novos com telefone ainda não disparados ────────
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: pendingLeads } = await supabaseAdmin
      .from("leads")
      .select("id, phone")
      .eq("status", "novo")
      .is("sdr_dispatched_at", null)
      .not("phone", "is", null)
      .lte("created_at", twoMinutesAgo) // espera 2 min antes de disparar
      .limit(10);

    const dispatched: string[] = [];
    for (const lead of pendingLeads ?? []) {
      const result = await dispatchSDR(lead.id);
      if (result.dispatched) dispatched.push(lead.id);
    }

    // ── Triggers comportamentais + remarketing email ────────────────────────
    const [triggers, emailsSent] = await Promise.all([
      processTriggers(),
      processEmailRemarketing(),
    ]);

    return NextResponse.json({
      success: true,
      sdr_dispatched: dispatched.length,
      emailsSent,
      ...triggers,
    });
  } catch (err) {
    console.error("[cron/process-triggers]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
