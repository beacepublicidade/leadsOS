export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/war-room?token=WAR_ROOM_TOKEN
// Retorna snapshot ao vivo para o TV Dashboard
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token && process.env.WAR_ROOM_TOKEN && token !== process.env.WAR_ROOM_TOKEN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  try {
    // Busca paralela para performance
    const [leadsRes, proposalsRes, clientsRes] = await Promise.all([
      supabaseAdmin.from("leads").select("*").order("created_at", { ascending: false }).limit(200),
      supabaseAdmin.from("proposals").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("clients").select("id, name"),
    ]);

    if (leadsRes.error) throw leadsRes.error;
    if (proposalsRes.error) throw proposalsRes.error;
    if (clientsRes.error) throw clientsRes.error;

    const leads     = (leadsRes.data     ?? []) as Record<string, unknown>[];
    const proposals = (proposalsRes.data ?? []) as Record<string, unknown>[];
    const clients   = (clientsRes.data   ?? []) as { id: string; name: string }[];

    // Métricas
    const leadsToday    = leads.filter(l => (l.created_at as string) >= todayStart).length;
    const leadsInConvo  = leads.filter(l => l.status === "contato").length;
    const leadsHot      = leads.filter(l => (l.score as number) >= 70).length;
    const leadsTotal    = leads.length;

    const propOpen      = proposals.filter(p => p.status === "awaiting_signature").length;
    const propSigned    = proposals.filter(p => p.status === "awaiting_payment").length;
    const propPaid      = proposals.filter(p => p.status === "paid").length;

    const propPendingValue = proposals
      .filter(p => p.status === "awaiting_signature" || p.status === "awaiting_payment")
      .reduce((s, p) => s + ((p.value as number) || 0), 0);

    const revenueMonth = proposals
      .filter(p => p.status === "paid" && (p.paid_at as string) >= monthStart)
      .reduce((s, p) => s + ((p.value as number) || 0), 0);

    const revenueTotal = proposals
      .filter(p => p.status === "paid")
      .reduce((s, p) => s + ((p.value as number) || 0), 0);

    // Feed de atividade recente (últimas 20 ações)
    const activity: { time: string; type: string; client?: string; message: string; icon: string }[] = [];

    leads.slice(0, 10).forEach(l => {
      const clientName = clients.find(c => c.id === l.client_id)?.name ?? "";
      activity.push({
        time:    l.created_at as string,
        type:    "lead",
        client:  clientName,
        message: `Novo lead: ${l.name as string}`,
        icon:    "👤",
      });
    });

    proposals.slice(0, 10).forEach(p => {
      const statusLabel: Record<string, { msg: string; icon: string }> = {
        awaiting_signature: { msg: `Proposta enviada: ${(p.lead_name as string) || "—"}`, icon: "📄" },
        awaiting_payment:   { msg: `Proposta assinada! ${(p.lead_name as string) || "—"}`, icon: "✍️" },
        paid:               { msg: `Pagamento confirmado! ${(p.lead_name as string) || "—"}`, icon: "💰" },
      };
      const s = statusLabel[p.status as string];
      if (s) {
        activity.push({ time: (p.updated_at as string) || (p.created_at as string), type: "proposal", message: s.msg, icon: s.icon });
      }
    });

    // Ordena por data desc, pega 20
    activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const recentActivity = activity.slice(0, 20);

    // Por cliente
    const clientStats = clients.map(c => {
      const cLeads     = leads.filter(l => l.client_id === c.id);
      const cProposals = proposals.filter(p => p.client_id === c.id);
      const cRevenue   = cProposals.filter(p => p.status === "paid").reduce((s, p) => s + ((p.value as number) || 0), 0);
      return {
        id:         c.id,
        name:       c.name,
        leads:      cLeads.length,
        leadsToday: cLeads.filter(l => (l.created_at as string) >= todayStart).length,
        active:     cLeads.filter(l => l.status === "contato").length,
        revenue:    cRevenue,
      };
    }).filter(c => c.leads > 0);

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          leadsToday,
          leadsInConvo,
          leadsHot,
          leadsTotal,
          propOpen,
          propSigned,
          propPaid,
          propPendingValue,
          revenueMonth,
          revenueTotal,
        },
        recentActivity,
        clientStats,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[GET /api/war-room]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar dados." }, { status: 500 });
  }
}
