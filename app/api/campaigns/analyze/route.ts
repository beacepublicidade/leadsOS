export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb }         from "@/lib/firebase-admin";
import { getSessionUser }     from "@/lib/getSessionUser";
import Anthropic              from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const session   = await getSessionUser(req);
    const body      = await req.json().catch(() => ({}));
    const client_id = session?.isAdmin
      ? (body.client_id || null)
      : (session?.client_id ?? null);

    // Busca leads parados (perdido, ou estagnados há 20+ dias)
    const db   = getAdminDb();
    const snap = await db.collection("leads")
      .where("status", "in", ["perdido", "novo", "contato"])
      .limit(200)
      .get();

    const cutoff = Date.now() - 20 * 24 * 60 * 60 * 1000;
    const candidates = snap.docs
      .filter((d) => {
        const data = d.data();
        if (client_id && data.client_id !== client_id) return false;
        const ref = data.status_changed_at ?? data.created_at;
        return ref && new Date(ref).getTime() <= cutoff;
      })
      .map((d) => {
        const data = d.data();
        const daysAgo = Math.floor((Date.now() - new Date(data.status_changed_at ?? data.created_at).getTime()) / 86_400_000);
        return {
          id:      d.id,
          name:    data.name,
          phone:   data.phone,
          email:   data.email,
          source:  data.source,
          status:  data.status,
          score:   data.score ?? 0,
          daysAgo,
          tags:    data.tags ?? [],
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 80);

    if (candidates.length === 0) {
      return NextResponse.json({
        success:     true,
        leads:       [],
        suggestion:  "Nenhum lead frio encontrado para reativação no momento.",
        copy:        "",
      });
    }

    // IA analisa e sugere
    const prompt = `Você é um especialista em marketing e reativação de leads.

Tenho a seguinte base de leads frios (parados há mais de 20 dias):

${candidates.slice(0, 30).map((l, i) =>
  `${i + 1}. ${l.name} | Score: ${l.score} | Status: ${l.status} | Origem: ${l.source} | Parado há ${l.daysAgo} dias${l.tags.length ? ` | Tags: ${l.tags.join(", ")}` : ""}`
).join("\n")}

Total de leads frios: ${candidates.length}

Com base nisso:
1. Identifique quais perfis têm maior potencial de reativação (considere score, origem e tempo parado)
2. Sugira 1 texto de mensagem de reativação curto, caloroso e persuasivo (máx 200 caracteres para WhatsApp)
3. Sugira 1 assunto e texto de email de reativação (máx 3 linhas)

Responda em JSON:
{
  "reasoning": "por que esses leads valem a pena reativar agora (2-3 linhas)",
  "whatsapp_copy": "texto da mensagem WA (use {nome} como variável)",
  "email_subject": "assunto do email",
  "email_body": "corpo do email (use {nome} como variável, máx 3 linhas)",
  "priority_count": número de leads que recomenda priorizar
}`;

    const response = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages:   [{ role: "user", content: prompt }],
    });

    let aiResult = { reasoning: "", whatsapp_copy: "", email_subject: "", email_body: "", priority_count: candidates.length };
    try {
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const json = text.match(/\{[\s\S]*\}/)?.[0];
      if (json) aiResult = { ...aiResult, ...JSON.parse(json) };
    } catch { /* usa defaults */ }

    return NextResponse.json({
      success:        true,
      leads:          candidates,
      reasoning:      aiResult.reasoning,
      whatsapp_copy:  aiResult.whatsapp_copy,
      email_subject:  aiResult.email_subject,
      email_body:     aiResult.email_body,
      priority_count: aiResult.priority_count,
    });
  } catch (err) {
    console.error("[POST /api/campaigns/analyze]", err);
    return NextResponse.json({ success: false, error: "Erro ao analisar base." }, { status: 500 });
  }
}
