export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb }     from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";
import Anthropic          from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const session   = await getSessionUser(req);
    const body      = await req.json().catch(() => ({})) as { month?: string; client_id?: string };
    const client_id = session?.isAdmin ? (body.client_id || null) : (session?.client_id ?? null);
    const month     = body.month || currentMonth();
    const [year, mon] = month.split("-").map(Number);

    const db  = getAdminDb();
    const startOf = new Date(year, mon - 1, 1).toISOString();
    const endOf   = new Date(year, mon, 1).toISOString();

    // Busca todos os leads do mês
    let snap = await db.collection("leads")
      .where("created_at", ">=", startOf)
      .where("created_at", "<",  endOf)
      .limit(300).get();

    // Filtra por client_id se necessário
    let leads = snap.docs.map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>));
    if (client_id) leads = leads.filter(l => l.client_id === client_id);

    // Também busca leads fechados no mês (por status_changed_at)
    const fechadoSnap = await db.collection("leads")
      .where("status", "==", "fechado")
      .where("status_changed_at", ">=", startOf)
      .where("status_changed_at", "<",  endOf)
      .limit(100).get();

    let fechados = fechadoSnap.docs.map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>));
    if (client_id) fechados = fechados.filter(l => l.client_id === client_id);

    // Agrega estatísticas
    const byStatus: Record<string, number> = {};
    for (const l of leads) {
      const s = String(l.status ?? "desconhecido");
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }

    const bySource: Record<string, number> = {};
    for (const l of leads) {
      const s = String(l.source ?? "desconhecido");
      bySource[s] = (bySource[s] ?? 0) + 1;
    }

    const revenue = fechados.reduce((acc, l) => acc + (Number(l.deal_value) || 0), 0);

    const prompt = `Você é um analista comercial sênior especializado em PMEs brasileiras.

Dados do mês ${month}:

📥 Total de leads capturados: ${leads.length}
✅ Deals fechados: ${fechados.length}
💰 Receita realizada: R$ ${revenue.toLocaleString("pt-BR")}
📊 Taxa de conversão: ${leads.length > 0 ? ((fechados.length / leads.length) * 100).toFixed(1) : 0}%

Distribuição por status:
${Object.entries(byStatus).map(([k,v]) => `- ${k}: ${v}`).join("\n")}

Distribuição por origem:
${Object.entries(bySource).map(([k,v]) => `- ${k}: ${v}`).join("\n")}

Com base nesses dados reais do sistema, faça um diagnóstico direto e humano:
1. O que funcionou bem esse mês (máx 2 pontos)
2. O que não funcionou / onde há gargalo (máx 2 pontos)
3. 2 ações concretas para o próximo mês

Responda em JSON:
{
  "summary": "1 frase resumindo o mês",
  "wins": ["ponto positivo 1", "ponto positivo 2"],
  "gaps": ["gargalo 1", "gargalo 2"],
  "actions": ["ação concreta 1", "ação concreta 2"],
  "mood": "excellent" | "good" | "average" | "tough"
}`;

    const response = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages:   [{ role: "user", content: prompt }],
    });

    let result = {
      summary: "Análise concluída.",
      wins:    [] as string[],
      gaps:    [] as string[],
      actions: [] as string[],
      mood:    "average" as string,
    };

    try {
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const json = text.match(/\{[\s\S]*\}/)?.[0];
      if (json) result = { ...result, ...JSON.parse(json) };
    } catch { /* usa defaults */ }

    // Salva diagnóstico no Firestore para consulta histórica
    await db.collection("monthly_reports").add({
      month, client_id,
      stats: { total: leads.length, fechados: fechados.length, revenue, byStatus, bySource },
      ...result,
      created_at: new Date().toISOString(),
      created_by: session?.email ?? "sistema",
    });

    return NextResponse.json({ success: true, month, stats: { total: leads.length, fechados: fechados.length, revenue }, ...result });
  } catch (err) {
    console.error("[POST /api/ai/monthly-report]", err);
    return NextResponse.json({ success: false, error: "Erro ao gerar diagnóstico." }, { status: 500 });
  }
}
