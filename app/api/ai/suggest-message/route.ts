import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const VALID_TYPES = ["status", "followup"];

// POST /api/ai/suggest-message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { type?: string; trigger?: string; niche?: string };
    const { type, trigger, niche } = body;

    if (!type || !trigger) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: type, trigger" },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Tipo inválido. Aceitos: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Graceful fallback if API key is not configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const fallback = buildFallback(type, trigger, niche);
      return NextResponse.json({ success: true, message: fallback }, { status: 200 });
    }

    const client = new Anthropic({ apiKey });

    const prompt = buildPrompt(type, trigger, niche);

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 256,
      system:
        "Você é um especialista em copywriting para WhatsApp. " +
        "Gere mensagens curtas, diretas e conversacionais. " +
        "Sempre use {{name}} para personalizar a mensagem com o nome do lead. " +
        "Responda APENAS com o texto da mensagem, sem aspas, sem explicações.",
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content.find((b) => b.type === "text");
    const message = block && block.type === "text" ? block.text.trim() : "";

    if (!message) {
      return NextResponse.json(
        { success: false, error: "IA não retornou uma mensagem válida" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/ai/suggest-message]", err);

    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { success: false, error: "Chave de API inválida. Verifique ANTHROPIC_API_KEY." },
        { status: 401 }
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { success: false, error: "Limite de requisições atingido. Tente novamente em instantes." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Erro ao gerar mensagem com IA" },
      { status: 500 }
    );
  }
}

function buildPrompt(type: string, trigger: string, niche: string | undefined): string {
  const nicheCtx = niche ? ` para o segmento de ${niche}` : "";

  if (type === "status") {
    return (
      `Crie uma mensagem de WhatsApp${nicheCtx} para o momento "${trigger}" no funil de vendas. ` +
      `A mensagem deve ser curta (1-2 linhas), amigável e usar {{name}} para personalizar.`
    );
  }

  // followup
  const followupOrder = trigger === "followup_1" ? "primeiro" : "segundo";
  return (
    `Crie uma mensagem de follow-up de WhatsApp${nicheCtx}. ` +
    `Este é o ${followupOrder} follow-up após o contato inicial. ` +
    `A mensagem deve ser curta (1-2 linhas), gentil, sem pressão, e usar {{name}}.`
  );
}

// Used when ANTHROPIC_API_KEY is not set
function buildFallback(type: string, trigger: string, niche: string | undefined): string {
  const nicheHint = niche ? ` (${niche})` : "";
  if (type === "followup") {
    return trigger === "followup_1"
      ? `Oi {{name}}, tudo bem? Só passando para ver se posso te ajudar com algo${nicheHint} 🙂`
      : `{{name}}, última mensagem por aqui! Se precisar de ajuda${nicheHint}, é só chamar 👋`;
  }
  return `Oi {{name}}, vi seu interesse${nicheHint}. Posso te ajudar com mais informações?`;
}
