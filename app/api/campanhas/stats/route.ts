export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const db = getAdminDb();
    const url = new URL(req.url);
    const clientId = url.searchParams.get("client_id") ?? session.client_id;

    let query = db.collection("leads").orderBy("created_at", "desc");
    if (clientId) {
      query = query.where("client_id", "==", clientId);
    }

    const snap = await query.get();
    const leads = snap.docs.map(d => d.data());

    // Agrupar por source
    const bySource: Record<string, { total: number; proposta: number; fechado: number }> = {};
    leads.forEach(l => {
      const src = (l.source as string) || "direto";
      if (!bySource[src]) bySource[src] = { total: 0, proposta: 0, fechado: 0 };
      bySource[src].total++;
      if (l.status === "proposta") bySource[src].proposta++;
      if (l.status === "fechado") bySource[src].fechado++;
    });

    // Agrupar por campanha
    const byCampaign: Record<string, { total: number; proposta: number; fechado: number; source: string }> = {};
    leads.forEach(l => {
      const campaign = (l.campaign_name as string) || (l.utm_campaign as string) || "";
      if (!campaign) return;
      if (!byCampaign[campaign]) byCampaign[campaign] = { total: 0, proposta: 0, fechado: 0, source: (l.source as string) || "" };
      byCampaign[campaign].total++;
      if (l.status === "proposta") byCampaign[campaign].proposta++;
      if (l.status === "fechado") byCampaign[campaign].fechado++;
    });

    const sourceStats = Object.entries(bySource).map(([source, stats]) => ({
      source,
      total: stats.total,
      proposta: stats.proposta,
      fechado: stats.fechado,
      conversion_rate: stats.total > 0 ? Math.round((stats.fechado / stats.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);

    const campaignStats = Object.entries(byCampaign).map(([name, stats]) => ({
      name,
      source: stats.source,
      total: stats.total,
      proposta: stats.proposta,
      fechado: stats.fechado,
      conversion_rate: stats.total > 0 ? Math.round((stats.fechado / stats.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);

    return NextResponse.json({
      success: true,
      data: {
        by_source: sourceStats,
        by_campaign: campaignStats,
        total_leads: leads.length,
      },
    });
  } catch (err) {
    console.error("[GET /api/campanhas/stats]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
