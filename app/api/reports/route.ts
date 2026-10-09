export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const session   = await getSessionUser(req);
    const client_id  = session?.isAdmin
      ? (searchParams.get("client_id") || null)
      : (session?.client_id ?? null);
    const start_date = searchParams.get("start_date") || null; // YYYY-MM-DD
    const end_date   = searchParams.get("end_date")   || null; // YYYY-MM-DD

    let leadsQuery = supabaseAdmin.from("leads").select("*").limit(2000);

    if (client_id)  leadsQuery = leadsQuery.eq("client_id", client_id);
    if (start_date) leadsQuery = leadsQuery.gte("created_at", start_date);
    if (end_date)   leadsQuery = leadsQuery.lte("created_at", end_date + "T23:59:59.999Z");

    const { data: leadsData, error } = await leadsQuery;
    if (error) throw error;

    const leads = (leadsData ?? []) as Record<string, unknown>[];

    const today     = new Date();
    const thisMonth = today.toISOString().slice(0, 7);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 7);

    // ── Leads por dia (período filtrado ou últimos 30 dias) ──────────────────
    const dayMap: Record<string, number> = {};
    if (start_date && end_date) {
      const cur = new Date(start_date);
      const end = new Date(end_date);
      while (cur <= end) {
        dayMap[cur.toISOString().slice(0, 10)] = 0;
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dayMap[d.toISOString().slice(0, 10)] = 0;
      }
    }
    for (const l of leads) {
      const day = (l.created_at as string | undefined)?.slice(0, 10);
      if (day && dayMap[day] !== undefined) dayMap[day]++;
    }
    const leads_by_day = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

    // ── Por status ───────────────────────────────────────────────────────────
    const statusOrder = ["novo", "contato", "proposta", "fechado", "perdido"];
    const statusMap: Record<string, number> = Object.fromEntries(statusOrder.map((s) => [s, 0]));
    for (const l of leads) {
      const s = (l.status as string | undefined) ?? "novo";
      const normalized = s === "new" ? "novo" : s;
      if (statusMap[normalized] !== undefined) statusMap[normalized]++;
    }
    const by_status = statusOrder.map((status) => ({ status, count: statusMap[status] }));

    // ── Drop-off por estágio ─────────────────────────────────────────────────
    const pipeline = ["novo", "contato", "proposta", "fechado"];
    const dropoff = pipeline.map((stage, i) => {
      const current  = statusMap[stage] ?? 0;
      const next     = i < pipeline.length - 1 ? (statusMap[pipeline[i + 1]] ?? 0) : null;
      const rate     = next !== null && current + next > 0
        ? Math.round((next / (current + next)) * 100)
        : null;
      return { stage, count: current, next_count: next, conversion_rate: rate };
    });

    // ── Por origem ───────────────────────────────────────────────────────────
    const sourceMap: Record<string, number> = {};
    for (const l of leads) {
      const src = (l.source as string | undefined) || "desconhecido";
      sourceMap[src] = (sourceMap[src] ?? 0) + 1;
    }
    const by_source = Object.entries(sourceMap)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    // ── Top campanhas ────────────────────────────────────────────────────────
    const campMap: Record<string, number> = {};
    for (const l of leads) {
      const c = (l.campaign_name as string | undefined)?.trim();
      if (c) campMap[c] = (campMap[c] ?? 0) + 1;
    }
    const top_campaigns = Object.entries(campMap)
      .map(([campaign, count]) => ({ campaign, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── SLA médio geral ──────────────────────────────────────────────────────
    const slaValues: number[] = [];
    for (const l of leads) {
      const created = l.created_at as string | undefined;
      const first   = l.first_response_at as string | undefined;
      if (created && first) {
        const mins = (new Date(first).getTime() - new Date(created).getTime()) / 60000;
        if (mins >= 0) slaValues.push(mins);
      }
    }
    const avg_sla_minutes = slaValues.length
      ? Math.round(slaValues.reduce((a, b) => a + b, 0) / slaValues.length)
      : null;

    // ── SLA por origem ───────────────────────────────────────────────────────
    const slaBySrcMap: Record<string, number[]> = {};
    for (const l of leads) {
      const created = l.created_at as string | undefined;
      const first   = l.first_response_at as string | undefined;
      const src     = (l.source as string | undefined) || "desconhecido";
      if (created && first) {
        const mins = (new Date(first).getTime() - new Date(created).getTime()) / 60000;
        if (mins >= 0) {
          if (!slaBySrcMap[src]) slaBySrcMap[src] = [];
          slaBySrcMap[src].push(mins);
        }
      }
    }
    const sla_by_source = Object.entries(slaBySrcMap)
      .map(([source, vals]) => ({
        source,
        avg_minutes: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      }))
      .sort((a, b) => a.avg_minutes - b.avg_minutes);

    // ── Tempo médio no estágio atual ─────────────────────────────────────────
    const stageTimeMap: Record<string, number[]> = {};
    for (const l of leads) {
      const status  = (l.status as string | undefined) ?? "novo";
      const ref     = (l.status_changed_at as string | undefined) ?? (l.created_at as string | undefined);
      if (ref && statusOrder.includes(status)) {
        const days = (Date.now() - new Date(ref).getTime()) / 86_400_000;
        if (!stageTimeMap[status]) stageTimeMap[status] = [];
        stageTimeMap[status].push(days);
      }
    }
    const avg_time_in_stage = statusOrder.map((status) => {
      const vals = stageTimeMap[status];
      if (!vals || vals.length === 0) return { status, avg_days: 0 };
      return {
        status,
        avg_days: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
      };
    });

    // ── Taxa de conversão ────────────────────────────────────────────────────
    const total    = leads.length;
    const fechados = statusMap["fechado"] ?? 0;
    const conversion_rate = total > 0 ? Math.round((fechados / total) * 100) : 0;

    // ── Este mês vs mês passado ──────────────────────────────────────────────
    const this_month  = leads.filter((l) => (l.created_at as string | undefined)?.startsWith(thisMonth)).length;
    const last_month  = leads.filter((l) => (l.created_at as string | undefined)?.startsWith(lastMonth)).length;
    const month_delta = last_month > 0 ? Math.round(((this_month - last_month) / last_month) * 100) : null;

    // ── Receita (propostas pagas) ────────────────────────────────────────────
    let proposalQuery = supabaseAdmin.from("proposals").select("*").eq("status", "paid");
    if (client_id) proposalQuery = proposalQuery.eq("client_id", client_id);

    const { data: paidProposalsData } = await proposalQuery;
    const paidProposals = (paidProposalsData ?? []) as Record<string, unknown>[];

    const total_revenue = paidProposals.reduce((sum, p) => sum + ((p.amount as number) ?? 0), 0);
    const avg_ticket    = paidProposals.length > 0 ? Math.round(total_revenue / paidProposals.length) : 0;
    const revenue_this_month = paidProposals
      .filter((p) => (p.paid_at as string | undefined)?.startsWith(thisMonth))
      .reduce((sum, p) => sum + ((p.amount as number) ?? 0), 0);
    const revenue_last_month = paidProposals
      .filter((p) => (p.paid_at as string | undefined)?.startsWith(lastMonth))
      .reduce((sum, p) => sum + ((p.amount as number) ?? 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        total,
        this_month,
        last_month,
        month_delta,
        conversion_rate,
        avg_sla_minutes,
        leads_by_day,
        by_status,
        by_source,
        top_campaigns,
        dropoff,
        sla_by_source,
        avg_time_in_stage,
        total_revenue,
        avg_ticket,
        revenue_this_month,
        revenue_last_month,
      },
    });
  } catch (err) {
    console.error("[GET /api/reports]", err);
    return NextResponse.json({ success: false, error: "Erro ao gerar relatório." }, { status: 500 });
  }
}
