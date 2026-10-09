export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";
import { callAI } from "@/lib/aiClient";

/**
 * POST /api/ai/insights
 * Gera insights automáticos sobre o pipeline de leads.
 */
export async function POST(req: NextRequest) {
  const hasKey = process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!hasKey) {
    return NextResponse.json({ success: false, error: "Nenhuma chave de IA configurada (ANTHROPIC_API_KEY ou OPENROUTER_API_KEY)." }, { status: 503 });
  }

  try {
    const session    = await getSessionUser(req);
    const body       = await req.json() as { client_id?: string };

    // Filtra por cliente se não for admin
    const clientId = session?.isAdmin
      ? (body.client_id || null)
      : (session?.client_id ?? null);

    let leadsQuery = supabaseAdmin.from("leads").select("*").limit(200);
    if (clientId) leadsQuery = leadsQuery.eq("client_id", clientId);

    const [leadsResult, propsResult] = await Promise.all([
      leadsQuery,
      supabaseAdmin.from("proposals").select("*").limit(100),
    ]);

    // Monta resumo para a IA
    const leads = leadsResult.data ?? [];
    const props  = propsResult.data ?? [];

    const byStatus = leads.reduce<Record<string, number>>((acc, l) => {
      const s = (l.status as string) ?? "novo";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {});

    const bySource = leads.reduce<Record<string, number>>((acc, l) => {
      const s = (l.source as string) ?? "unknown";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {});

    const paidProps  = props.filter((p) => p.status === "paid");
    const revenue    = paidProps.reduce((s, p) => s + ((p.amount as number) ?? 0), 0);
    const avgScore   = leads.length
      ? Math.round(leads.reduce((s, l) => s + ((l.score as number) ?? 0), 0) / leads.length)
      : 0;

    const summary = `
Pipeline de leads (últimos ${leads.length}):
- Por status: ${JSON.stringify(byStatus)}
- Por origem: ${JSON.stringify(bySource)}
- Propostas pagas: ${paidProps.length} | Receita total: R$ ${revenue.toFixed(2)}
- Score médio dos leads: ${avgScore}/100
- Total de propostas: ${props.length}
`;

    const prompt = `Você é um analista de vendas especializado. Analise os dados abaixo e forneça:\n1. 3-5 insights acionáveis sobre o pipeline\n2. Identificação do maior gargalo de conversão\n3. Recomendação prioritária para aumentar receita\n4. Tom direto, prático, sem enrolação. Use bullet points.\n\nDados:\n${summary}`;

    const insights = await callAI({ prompt, maxTokens: 800, claudeModel: "claude-haiku-4-5-20251001" });

    return NextResponse.json({ success: true, insights, summary: { byStatus, bySource, revenue, avgScore, totalLeads: leads.length } });
  } catch (err) {
    console.error("[POST /api/ai/insights]", err);
    return NextResponse.json({ success: false, error: "Erro ao gerar insights." }, { status: 500 });
  }
}
