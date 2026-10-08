export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const WAR_ROOM_TOKEN = "war_room_beace_2026";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (token !== WAR_ROOM_TOKEN) {
      return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 });
    }

    const db = getAdminDb();
    const now = new Date();

    // Início do dia (UTC)
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startOfDayISO = startOfDay.toISOString();

    // Início do mês
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfMonthISO = startOfMonth.toISOString();

    // Busca todos os leads (sem filtros compostos para evitar exigência de índice)
    // Limit 1000 para performance; dados de war room são agregados, não paginados
    const allLeadsSnap = await db.collection("leads").limit(1000).get();

    const allLeads = allLeadsSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as Array<{
      id: string;
      name: string;
      status: string;
      source: string;
      created_at: string;
      updated_at: string;
    }>;

    // Filtros em JS — sem necessidade de índice composto no Firestore
    const leadsHoje = allLeads.filter(l => (l.created_at ?? "") >= startOfDayISO).length;
    const emConversa = allLeads.filter(l => l.status === "contato").length;
    const propostasAbertas = allLeads.filter(l => l.status === "proposta").length;
    const fechadosMes = allLeads.filter(
      l => l.status === "fechado" && (l.created_at ?? "") >= startOfMonthISO
    ).length;

    // Atividade recente: últimos 10 leads por updated_at ou created_at
    const atividadeRecente = [...allLeads]
      .sort((a, b) => {
        const dateA = a.updated_at ?? a.created_at ?? "";
        const dateB = b.updated_at ?? b.created_at ?? "";
        return dateB.localeCompare(dateA);
      })
      .slice(0, 10)
      .map(l => ({
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
        leads_hoje: leadsHoje,
        em_conversa: emConversa,
        propostas_abertas: propostasAbertas,
        fechados_mes: fechadosMes,
        atividade_recente: atividadeRecente,
        generated_at: now.toISOString(),
      },
    });
  } catch (err) {
    console.error("[War Room GET /api/naia/war-room]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
