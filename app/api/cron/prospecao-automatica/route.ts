export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { dispatchSDR }   from "@/services/sdrDispatchService";

/**
 * GET /api/cron/prospecao-automatica
 * Roda diariamente às 9h BRT.
 * Executa buscas por nicho/zona configuradas e popula o pipeline automaticamente.
 */
export async function GET(req: NextRequest) {
  try {
    // Agenda de prospecção — 1 nicho por zona, rotaciona diariamente
    const dayOfWeek = new Date().getDay(); // 0=Dom, 1=Seg...

    const schedule: Array<{ nicho: string; zona: string; cidade: string; limite: number }> = [
      { nicho: "restaurante",        zona: "Zona Sul",   cidade: "São Paulo SP", limite: 8 },
      { nicho: "clínica odontológica",zona: "Zona Norte", cidade: "São Paulo SP", limite: 8 },
      { nicho: "hamburgueria",       zona: "Zona Leste", cidade: "São Paulo SP", limite: 8 },
      { nicho: "pet shop",           zona: "Zona Oeste", cidade: "São Paulo SP", limite: 8 },
      { nicho: "barbearia",          zona: "Centro",     cidade: "São Paulo SP", limite: 8 },
      { nicho: "academia",           zona: "Zona Sul",   cidade: "São Paulo SP", limite: 8 },
      { nicho: "clínica estética",   zona: "Zona Norte", cidade: "São Paulo SP", limite: 8 },
    ];

    // Hoje roda o item correspondente ao dia da semana (seg=0, dom=6)
    const todayTask = schedule[dayOfWeek % schedule.length];

    const DOMINUS_URL = process.env.DOMINUS_URL ?? "";

    // Chama o endpoint de prospecção interno
    const prospecaoRes = await fetch(`${DOMINUS_URL.replace("dominus-docs.vercel.app", "leads-os.vercel.app")}/api/prospecao`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        nicho:       `${todayTask.nicho} ${todayTask.zona}`,
        cidade:      todayTask.cidade,
        limite:      todayTask.limite,
        modo_oferta: "automatico",
        client_id:   "2e758b56-5cc9-4766-9003-26fa23dbfa5d", // beace Publicidade
        enviar:      false, // não envia WhatsApp automaticamente — SDR dispatch cuida disso
      }),
    });

    let prospecaoData = null;
    if (prospecaoRes.ok) {
      prospecaoData = await prospecaoRes.json();
    }

    // Buscar leads novos criados nos últimos 5 minutos para dispatch
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: novosLeads } = await supabaseAdmin
      .from("leads")
      .select("id, phone")
      .eq("status", "novo")
      .is("sdr_dispatched_at", null)
      .not("phone", "is", null)
      .gte("created_at", fiveMinAgo)
      .limit(20);

    let dispatched = 0;
    for (const lead of novosLeads ?? []) {
      const r = await dispatchSDR(lead.id);
      if (r.dispatched) dispatched++;
    }

    // Log no Supabase
    await supabaseAdmin.from("logs").insert({
      type:       "cron",
      lead_id:    null,
      message:    `Prospecção automática: ${todayTask.nicho} — ${todayTask.zona}. Leads encontrados: ${prospecaoData?.data?.qualificados ?? 0}. SDRs disparados: ${dispatched}.`,
      created_at: new Date().toISOString(),
    }).catch(() => {});

    return NextResponse.json({
      success:    true,
      task:       todayTask,
      prospected: prospecaoData?.data?.qualificados ?? 0,
      dispatched,
    });
  } catch (err) {
    console.error("[cron/prospecao-automatica]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
