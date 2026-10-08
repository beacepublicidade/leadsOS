export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// GET /api/reports/full?token=xxx
// Endpoint público autenticado por token estático para dashboards externas
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const token = searchParams.get("token");
  if (!token || token !== process.env.REPORTS_API_TOKEN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const client_id = searchParams.get("client_id") || null;

  try {
    let query = getAdminDb()
      .collection("leads") as FirebaseFirestore.Query;

    if (client_id) query = query.where("client_id", "==", client_id);

    const snap  = await query.limit(5000).get();
    const leads = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Record<string, unknown>[];

    const statusOrder = ["novo", "contato", "proposta", "fechado", "perdido"];

    // ── Funil ────────────────────────────────────────────────────────────────
    const statusMap: Record<string, number> = Object.fromEntries(statusOrder.map((s) => [s, 0]));
    for (const l of leads) {
      const s = ((l.status as string | undefined) ?? "novo").replace(/^new$/, "novo");
      if (statusMap[s] !== undefined) statusMap[s]++;
    }

    const funnelData = {
      leadsGerados:   leads.length,
      orcamentos:     statusMap["proposta"] ?? 0,
      taxaOrcamento:  leads.length > 0 ? Math.round(((statusMap["proposta"] ?? 0) / leads.length) * 100 * 100) / 100 : 0,
      vendas:         statusMap["fechado"]  ?? 0,
      taxaVenda:      leads.length > 0 ? Math.round(((statusMap["fechado"]  ?? 0) / leads.length) * 100 * 100) / 100 : 0,
      pedidosPerdidos: statusMap["perdido"] ?? 0,
    };

    // ── Leads por mês (últimos 6 meses) ──────────────────────────────────────
    const today    = new Date();
    const months: { key: string; mes: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const mes = d.toLocaleString("pt-BR", { month: "short" });
      months.push({ key, mes: mes.charAt(0).toUpperCase() + mes.slice(1).replace(".", "") });
    }

    const monthLeadMap: Record<string, number>    = Object.fromEntries(months.map((m) => [m.key, 0]));
    const monthFechadoMap: Record<string, number> = Object.fromEntries(months.map((m) => [m.key, 0]));

    for (const l of leads) {
      const month = (l.created_at as string | undefined)?.slice(0, 7);
      if (month && monthLeadMap[month] !== undefined) {
        monthLeadMap[month]++;
        const s = ((l.status as string | undefined) ?? "novo").replace(/^new$/, "novo");
        if (s === "fechado") monthFechadoMap[month]++;
      }
    }

    const monthlyLeads = months.map(({ key, mes }) => {
      const total   = monthLeadMap[key] ?? 0;
      const fechado = monthFechadoMap[key] ?? 0;
      return {
        mes,
        leads:  total,
        txConv: total > 0 ? Math.round((fechado / total) * 100 * 100) / 100 : 0,
      };
    });

    // ── Leads por dia da semana ───────────────────────────────────────────────
    const diasPt = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const dayMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const l of leads) {
      const created = l.created_at as string | undefined;
      if (created) {
        const dow = new Date(created).getDay();
        dayMap[dow]++;
      }
    }
    // Ordem: Segunda → Domingo
    const leadsDiaSemana = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
      dia:   diasPt[d],
      leads: dayMap[d] ?? 0,
    }));

    // ── Origem dos leads ──────────────────────────────────────────────────────
    const sourceMap: Record<string, number> = {};
    for (const l of leads) {
      const src = (l.source as string | undefined) || "desconhecido";
      sourceMap[src] = (sourceMap[src] ?? 0) + 1;
    }

    const SOURCE_COLORS: Record<string, string> = {
      meta_ads:     "#1877F2",
      google_ads:   "#EA4335",
      landing_page: "#10b981",
      manual:       "#8b5cf6",
      whatsapp:     "#25d366",
      desconhecido: "#9ca3af",
    };

    const originLeads = Object.entries(sourceMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name:  name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: Math.round((value / leads.length) * 100),
        color: SOURCE_COLORS[name] ?? "#9ca3af",
      }));

    const fechadosBySource: Record<string, number> = {};
    for (const l of leads) {
      const s   = ((l.status as string | undefined) ?? "novo").replace(/^new$/, "novo");
      const src = (l.source as string | undefined) || "desconhecido";
      if (s === "fechado") fechadosBySource[src] = (fechadosBySource[src] ?? 0) + 1;
    }
    const totalFechados = Object.values(fechadosBySource).reduce((a, b) => a + b, 0);
    const originVendas  = Object.entries(fechadosBySource)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name:  name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: totalFechados > 0 ? Math.round((value / totalFechados) * 100) : 0,
        color: SOURCE_COLORS[name] ?? "#9ca3af",
      }));

    // ── Top campanhas ─────────────────────────────────────────────────────────
    const campMap: Record<string, { total: number; fechados: number; plataforma: string }> = {};
    for (const l of leads) {
      const camp = (l.campaign_name as string | undefined)?.trim();
      if (!camp) continue;
      const src = (l.source as string | undefined) ?? "";
      const plataforma = src === "google_ads" ? "Google Ads" : src === "meta_ads" ? "Meta Ads" : "Outros";
      const s   = ((l.status as string | undefined) ?? "novo").replace(/^new$/, "novo");
      if (!campMap[camp]) campMap[camp] = { total: 0, fechados: 0, plataforma };
      campMap[camp].total++;
      if (s === "fechado") campMap[camp].fechados++;
    }

    const campanhas = Object.entries(campMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([nome, v]) => ({
        nome,
        plataforma: v.plataforma,
        resultados: v.total,
        vendas:     v.fechados,
        txConv:     v.total > 0 ? Math.round((v.fechados / v.total) * 100 * 100) / 100 : 0,
        // Métricas de custo ficam nulas até integração com Meta/Google API
        investido: null,
        cpl:       null,
        ctr:       null,
        cpc:       null,
        roas:      null,
        status:    "ativo",
      }));

    // ── Resumo geral ──────────────────────────────────────────────────────────
    const thisMonth = today.toISOString().slice(0, 7);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 7);
    const thisMonthCount = leads.filter((l) => (l.created_at as string | undefined)?.startsWith(thisMonth)).length;
    const lastMonthCount = leads.filter((l) => (l.created_at as string | undefined)?.startsWith(lastMonth)).length;
    const monthDelta     = lastMonthCount > 0
      ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
      : null;

    return NextResponse.json({
      success: true,
      data: {
        // Metadados
        generated_at: new Date().toISOString(),
        total_leads:  leads.length,
        this_month:   thisMonthCount,
        last_month:   lastMonthCount,
        month_delta:  monthDelta,
        // Dados do funil
        funnelData,
        // Séries temporais
        monthlyLeads,
        leadsDiaSemana,
        // Distribuição de origem
        originLeads,
        originVendas,
        // Campanhas
        campanhas,
      },
    });
  } catch (err) {
    console.error("[GET /api/reports/full]", err);
    return NextResponse.json({ success: false, error: "Erro ao gerar relatório." }, { status: 500 });
  }
}
