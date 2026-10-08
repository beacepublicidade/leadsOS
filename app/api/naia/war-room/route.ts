export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const WAR_ROOM_TOKEN = "war_room_beace_2026";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (token !== WAR_ROOM_TOKEN) {
      return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 });
    }

    const now = new Date();

    // Início do dia no timezone do Brasil (UTC-3)
    // Para garantir que leads criados após 00:00 BRT sejam incluídos,
    // calculamos o início do dia local (setHours respeita o TZ do servidor — em Vercel = UTC).
    // Como Vercel roda em UTC, calculamos explicitamente o início do dia em UTC-3:
    const BRT_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC-3
    const nowBRT = new Date(now.getTime() - BRT_OFFSET_MS);
    const startOfDayBRT = new Date(nowBRT);
    startOfDayBRT.setUTCHours(0, 0, 0, 0);
    // Converte de volta para UTC
    const startOfDayUTC = new Date(startOfDayBRT.getTime() + BRT_OFFSET_MS);
    const startOfDayISO = startOfDayUTC.toISOString();

    // Início do mês em BRT
    const startOfMonthBRT = new Date(Date.UTC(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), 1));
    const startOfMonthUTC = new Date(startOfMonthBRT.getTime() + BRT_OFFSET_MS);
    const startOfMonthISO = startOfMonthUTC.toISOString();

    // Leads de hoje: filtro no Supabase (TIMESTAMPTZ >= startOfDayISO)
    const [
      { count: leadsHoje },
      { count: emConversa },
      { count: propostasAbertas },
      { count: fechadosMes },
      { data: atividadeData },
    ] = await Promise.all([
      supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfDayISO),

      supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "contato"),

      supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "proposta"),

      supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "fechado")
        .gte("created_at", startOfMonthISO),

      supabaseAdmin
        .from("leads")
        .select("id, name, status, source, created_at, updated_at")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(10),
    ]);

    const atividadeRecente = (atividadeData ?? []).map(l => ({
      id: l.id,
      name: l.name,
      status: l.status,
      source: l.source,
      created_at: l.created_at,
      updated_at: l.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        leads_hoje:       leadsHoje  ?? 0,
        em_conversa:      emConversa ?? 0,
        propostas_abertas: propostasAbertas ?? 0,
        fechados_mes:     fechadosMes ?? 0,
        atividade_recente: atividadeRecente,
        generated_at:     now.toISOString(),
        debug: { startOfDayISO, startOfMonthISO },
      },
    });
  } catch (err) {
    console.error("[War Room GET /api/naia/war-room]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
