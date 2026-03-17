import Anthropic from "@anthropic-ai/sdk";
import type { CreateTemplateInput } from "@/types/template";

interface GeneratedMessages {
  contato:    string;
  proposta:   string;
  followup_1: string;
  followup_2: string;
}

const TRIGGERS: Array<{ key: keyof GeneratedMessages; type: "status" | "followup"; name: string }> = [
  { key: "contato",    type: "status",   name: "Contato"    },
  { key: "proposta",   type: "status",   name: "Proposta"   },
  { key: "followup_1", type: "followup", name: "Follow-up 1" },
  { key: "followup_2", type: "followup", name: "Follow-up 2" },
];

// Generates 4 WhatsApp templates using Claude for a given niche.
// Returns null if ANTHROPIC_API_KEY is not configured or the API call fails.
export async function generateTemplatesWithAI(
  niche: string,
  client_id: string
): Promise<CreateTemplateInput[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("[LeadsOS] ANTHROPIC_API_KEY not set — skipping AI template generation");
    return null;
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model:      "claude-opus-4-6",
    max_tokens: 512,
    system:
      "Você é um especialista em copywriting para WhatsApp no segmento solicitado. " +
      "Gere mensagens curtas (1-2 linhas), diretas e no estilo WhatsApp brasileiro. " +
      "Sempre use {{name}} para personalizar com o nome do lead. " +
      "Responda SOMENTE com um JSON válido, sem markdown, sem explicações.",
    messages: [
      {
        role:    "user",
        content:
          `Gere 4 mensagens de WhatsApp para o segmento "${niche}":\n` +
          `- contato: primeiro contato após o lead demonstrar interesse\n` +
          `- proposta: quando uma proposta é enviada\n` +
          `- followup_1: primeiro follow-up (10 minutos após contato inicial)\n` +
          `- followup_2: segundo follow-up (24 horas após, última tentativa)\n\n` +
          `Formato esperado:\n` +
          `{"contato":"...","proposta":"...","followup_1":"...","followup_2":"..."}`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return null;

  // Strip any accidental markdown code fences
  const raw = block.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  const parsed = JSON.parse(raw) as Partial<GeneratedMessages>;

  // Validate all 4 keys are present and non-empty strings
  const allValid = TRIGGERS.every(
    ({ key }) => typeof parsed[key] === "string" && (parsed[key] as string).trim().length > 0
  );
  if (!allValid) return null;

  return TRIGGERS.map(({ key, type, name }) => ({
    name,
    type,
    trigger:   key,
    message:   (parsed[key] as string).trim(),
    client_id,
  }));
}
