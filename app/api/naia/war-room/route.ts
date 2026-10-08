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
    const startOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const startOfMonthISO = startOfMonth.toISOString();

    // Busca paralela de todos os contadores
    const [
      leadsHojeSnap,
      emConversaSnap,
      propostasSnap,
      fechadosMesSnap,
      recenteSnap,
    ] = await Promise.all([
      // leads criados hoje
      db.collection("leads")
        .where("created_at", ">=", startOfDayISO)
        .get(),
      // em conversa (status=contato)
      db.collection("leads")
        .where("status", "==", "contato")
        .get(),
      // propostas abertas
      db.collection("leads")
        .where("status", "==", "proposta")
        .get(),
      // fechados este mês
      db.collection("leads")
        .where("status", "==", "fechado")
        .where("created_at", ">=", startOfMonthISO)
        .get(),
      // atividade recente: últimos 10 leads (sem orderBy para evitar índice)
      db.collection("leads")
        .limit(200)
        .get(),
    ]);

    // Ordena recentes no JS e pega top 10
    const atividadeRecente = recenteSnap.docs
      .map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          status: data.status,
          source: data.source,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      })
      .sort((a, b) => {
        const dateA = a.updated_at ?? a.created_at ?? "";
        const dateB = b.updated_at ?? b.created_at ?? "";
        return dateB.localeCompare(dateA);
      })
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        leads_hoje: leadsHojeSnap.size,
        em_conversa: emConversaSnap.size,
        propostas_abertas: propostasSnap.size,
        fechados_mes: fechadosMesSnap.size,
        atividade_recente: atividadeRecente,
        generated_at: now.toISOString(),
      },
    });
  } catch (err) {
    console.error("[War Room GET /api/naia/war-room]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
