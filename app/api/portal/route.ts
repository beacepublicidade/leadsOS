export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * GET /api/portal?t=TOKEN
 * Retorna dados do cliente e resumo do pipeline para o Portal do Cliente.
 * Autenticação via portal_token armazenado no doc do cliente.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) return NextResponse.json({ error: "Token obrigatório." }, { status: 400 });

  const db = getAdminDb();

  // Busca cliente pelo portal_token
  const clientSnap = await db.collection("clients")
    .where("portal_token", "==", token)
    .limit(1)
    .get();

  if (clientSnap.empty) return NextResponse.json({ error: "Token inválido." }, { status: 404 });

  const clientDoc = clientSnap.docs[0];
  const client    = clientDoc.data();
  const clientId  = clientDoc.id;

  // Busca leads do cliente
  const leadsSnap = await db.collection("leads")
    .where("client_id", "==", clientId)
    .get();

  const leads = leadsSnap.docs.map(d => d.data());

  // Agrupamento por status
  const byStatus: Record<string, number> = {};
  for (const lead of leads) {
    const s = (lead.status as string) ?? "novo";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  // Propostas/fechamentos no mês atual
  const now       = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const closedThisMonth = leads.filter(l =>
    l.status === "fechado" && (l.status_updated_at as string) >= startMonth
  ).length;

  // Receita do mês via propostas fechadas
  const propSnap = await db.collection("proposals")
    .where("client_id", "==", clientId)
    .where("status", "==", "signed")
    .get();

  const totalRevenue = propSnap.docs.reduce((sum, d) => sum + ((d.data().value as number) ?? 0), 0);

  // Score médio
  const scores  = leads.map(l => (l.score as number) ?? 0).filter(s => s > 0);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // Leads recentes (últimos 10) — sem dados sensíveis
  type LeadRaw = { id: string; name?: string; status?: string; source?: string; score?: number; created_at?: string };
  const recent = (leadsSnap.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<LeadRaw, "id">) })) as LeadRaw[])
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
