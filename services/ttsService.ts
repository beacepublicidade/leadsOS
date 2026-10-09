/**
 * ttsService.ts — Converte texto em áudio de voz para envio via WhatsApp
 * Usa OpenAI TTS (nova, shimmer, alloy) e entrega buffer OGG Opus (formato nativo do WhatsApp).
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

export type TTSVoice = "nova" | "shimmer" | "alloy" | "echo" | "fable" | "onyx";

// Mapa de voz por SDR — cada agente tem uma voz consistente
export const SDR_VOICES: Record<string, TTSVoice> = {
  ALEX: "nova",    // feminina, jovem, energética — Social Mídia
  MAX:  "onyx",   // masculina, confiante — Tráfego Pago
  LEO:  "echo",   // masculina, criativa — Vídeo
  ANA:  "shimmer",// feminina, calorosa — Design
  VERA: "fable",  // feminina, consultiva — Pacote Completo
  REX:  "alloy",  // neutro — genérico
};

/**
 * Gera áudio a partir de texto usando OpenAI TTS.
 * Retorna buffer em formato mp3 (Evolution API aceita mp3 e ogg).
 */
export async function generateVoiceMessage(
  text: string,
  voice: TTSVoice = "nova",
): Promise<Buffer | null> {
  if (!OPENAI_API_KEY) {
    console.warn("[tts] OPENAI_API_KEY não configurada");
    return null;
  }

  // Limpar texto para TTS — remover emojis e símbolos que soam estranho
  const cleanText = text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")   // emojis
    .replace(/[*_~`#]/g, "")                   // markdown
    .replace(/\|\|[^|]+\|\|/g, "")             // spoilers
    .replace(/\n{2,}/g, ". ")                  // quebras duplas viram pausa
    .replace(/\n/g, " ")
    .trim();

  if (!cleanText || cleanText.length < 5) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",       // tts-1-hd para mais qualidade (2x o custo)
        input: cleanText.slice(0, 4096),
        voice,
        response_format: "mp3",
        speed: 1.0,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[tts] OpenAI TTS erro:", res.status, err.slice(0, 200));
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[tts] Erro ao gerar voz:", err);
    return null;
  }
}

/**
 * Decide se esta mensagem deve ser enviada como áudio.
 * Regra: ~30% das mensagens, priorizando abertura e proposta de reunião.
 */
export function shouldSendAsAudio(
  message: string,
  messageCount: number, // quantas mensagens já foram trocadas com esse lead
): boolean {
  const lower = message.toLowerCase();

  // Sempre áudio na abertura (primeira mensagem)
  if (messageCount === 0) return true;

  // Sempre áudio na proposta de reunião
  if (
    lower.includes("reunião") ||
    lower.includes("conversar") ||
    lower.includes("bate-papo") ||
    lower.includes("agendar") ||
    lower.includes("call")
  ) return true;

  // Nunca áudio em mensagens curtas ou confirmações
  if (message.length < 60) return false;

  // 25% de chance nas demais mensagens para parecer natural
  return Math.random() < 0.25;
}
