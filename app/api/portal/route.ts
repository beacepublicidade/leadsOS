export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/portal?t=TOKEN
 * Retorna dados do cliente e resumo do pipeline para o Portal do Cliente.
 * Autenticação via portal_token armazenado no doc do cliente.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) return NextResponse.json({ error: "Token obrigatório." }, { status: 400 });

  // Busca cliente pelo portal_token
  const { data: clientRows, error: clientError } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("portal_token", token)
    .limit(1);

  if (clientError || !clientRows || clientRows.length === 0) {
    return NextResponse.json({ error: "Token inválido." }, { status: 404 });
  }

  const client   = clientRows[0];
  const clientId = client.id;

  // Busca leads do cliente
  const { data: leadsData } = await supabaseAdmin.from("leads").select("*").eq("client_id", clientId);
  const leads = leadsData ?? [];

  // Agrupamento por status
  const byStatus: Record<string, number> = {};
  for (const lead of leads) {
    const s = (lead.status as string) ?? "novo";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  // Propostas/fechamentos no mês atual
  const now        = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const closedThisMonth = leads.filter(l =>
    l.status === "fechado" && (l.status_updated_at as string) >= startMonth
  ).length;

  // Receita do mês via propostas fechadas
  const { data: propData } = await supabaseAdmin
    .from("proposals")
    .select("value")
    .eq("client_id", clientId)
    .eq("status", "signed");

  const totalRevenue = (propData ?? []).reduce((sum, d) => sum + ((d.value as number) ?? 0), 0);

  // Score médio
  const scores  = leads.map(l => (l.score as number) ?? 0).filter(s => s > 0);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // Leads recentes (últimos 10) — sem dados sensíveis
  type LeadRaw = { id: string; name?: string; status?: string; source?: string; score?: number; created_at?: string };
  const recent = (leads as LeadRaw[])
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 10)
    .map(l => ({
      id:         l.id,
      name:       l.name       ?? "Lead",
      status:     l.status     ?? "novo",
      source:     l.source     ?? "",
      score:      l.score      ?? 0,
      created_at: l.created_at ?? "",
    }));

  return NextResponse.json({
    success: true,
    client: {
      name:        client.name        as string,
      niche:       client.niche       as string,
      brand_color: client.brand_color as string | undefined,
      lp_logo_url: client.lp_logo_url as string | undefined,
    },
    stats: {
      total:          leads.length,
      byStatus,
      closedThisMonth,
      totalRevenue,
      avgScore,
    },
    recent,
  });
}
