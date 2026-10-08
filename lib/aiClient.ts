/**
 * Unified AI client — Claude primário, Nemotron como fallback automático.
 *
 * Comportamento padrão (AI_PROVIDER não definido ou "claude"):
 *   1. Tenta Claude (ANTHROPIC_API_KEY)
 *   2. Se falhar (rate limit, quota, erro), tenta Nemotron via OpenRouter (OPENROUTER_API_KEY)
 *   3. Se Nemotron também falhar, lança o erro original do Claude
 *
 * Variáveis:
 *   AI_PROVIDER        — "claude" (padrão, com fallback Nemotron) | "nemotron" (força Nemotron)
 *   ANTHROPIC_API_KEY  — chave Claude
 *   OPENROUTER_API_KEY — chave OpenRouter (fallback gratuito)
 *   NEMOTRON_MODEL     — override do modelo Nemotron (default: nvidia/nemotron-3-ultra-550b-a55b:free)
 */

export interface AICallOptions {
  prompt: string;
  system?: string;
  maxTokens?: number;
  /** Modelo Claude específico para este endpoint (ignorado quando AI_PROVIDER=nemotron) */
  claudeModel?: string;
}

export async function callAI(opts: AICallOptions): Promise<string> {
  const provider = (process.env.AI_PROVIDER ?? "claude").toLowerCase();

  if (provider === "nemotron") return callNemotron(opts);

  // Claude primário com fallback automático para Nemotron
  try {
    return await callClaude(opts);
  } catch (claudeErr) {
    if (process.env.OPENROUTER_API_KEY) {
      console.warn("[aiClient] Claude falhou, usando Nemotron como fallback:", claudeErr instanceof Error ? claudeErr.message : claudeErr);
      return callNemotron(opts);
    }
    throw claudeErr;
  }
}

async function callClaude({ system, prompt, maxTokens = 1024, claudeModel }: AICallOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model:      claudeModel ?? "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages:   [{ role: "user", content: prompt }],
  });

  const block = response.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text.trim() : "";
}

async function callNemotron({ system, prompt, maxTokens = 1024 }: AICallOptions): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  const model  = process.env.NEMOTRON_MODEL ?? "nvidia/nemotron-3-ultra-550b-a55b:free";

  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer":  process.env.NEXT_PUBLIC_APP_URL ?? "https://leads-os.vercel.app",
      "X-Title":       "LeadsOS NAIA",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter erro (${res.status}): ${err.slice(0, 200)}`);
  }

  const json = await res.json() as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content?.trim() ?? "";
}
