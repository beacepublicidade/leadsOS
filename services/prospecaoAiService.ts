// Análise de empresa + geração de oferta personalizada via IA (Claude ou Nemotron)

import { callAI } from "@/lib/aiClient";
import type { OutscraperResult, ReviewSnippet } from "./prospecaoService";

export interface BeaceService {
  id:          string;
  name:        string;
  description: string;
}

export interface ProspecaoAnalysis {
  dores:        string[];
  servicos:     string[];
  mensagem:     string;
  score:        number;
  qualificado:  boolean;
}

const BEACE_CONTEXT = `
Você é um SDR sênior da Beace, agência de marketing digital e automação comercial.

Serviços que a Beace oferece:
- Tráfego pago (Meta Ads, Google Ads) — gera leads qualificados no piloto automático
- Gestão de redes sociais — presença profissional que vende
- Edição de vídeo (Reels, YouTube) — conteúdo que converte
- Sites e Landing Pages — estrutura digital que converte visita em cliente
- Automação comercial com IA — sistema que prospecta, qualifica e fecha clientes via WhatsApp 24h
- Consultoria estratégica — clareza no que fazer pra crescer

Perfil ideal de cliente (ICP):
- Negócio local com presença no Google Maps
- Nota entre 3.5 e 4.9 (tem clientes mas ainda tem espaço pra crescer)
- Tem telefone (conseguimos contato direto)
- Categoria com ticket médio alto: clínicas, escritórios, academias, construtoras, imobiliárias, restaurantes premium, escolas
- Sinais de dor: poucas avaliações, sem site, sem redes sociais ativas, reviews reclamando de demora no atendimento
`;

export async function analyzeAndGenerateMessage(
  empresa: OutscraperResult,
  servicosCadastrados: BeaceService[] = [],
  modoOferta: "automatico" | "pacote" = "automatico",
  reviews: ReviewSnippet[] = []
): Promise<ProspecaoAnalysis> {
  const servicosExtra = servicosCadastrados.length > 0 && modoOferta === "pacote"
    ? `\nPacotes disponíveis para mencionar:\n${servicosCadastrados.map((s) => `- ${s.name}: ${s.description}`).join("\n")}\n`
    : "";

  const reviewsInfo = reviews.length > 0
    ? `\nAvaliações recentes dos clientes deles:\n${reviews.map((r) => `- "${r.text}" (${r.rating}⭐)`).join("\n")}`
    : "";

  const empresaInfo = `
Empresa: ${empresa.name}
Categoria: ${empresa.category ?? "não informado"}
Endereço: ${empresa.full_address}
Nota Google: ${empresa.rating ?? "sem nota"} estrelas (${empresa.reviews ?? 0} avaliações)
Site: ${empresa.website ?? "não tem site"}
Descrição: ${empresa.description ?? "sem descrição"}${reviewsInfo}
`.trim();

  const prompt = `${BEACE_CONTEXT}${servicosExtra}

Analise esta empresa e gere uma abordagem comercial personalizada:

${empresaInfo}

CRITÉRIOS DE SCORE (1-10):
- Tem telefone: +2 pontos (já tem, senão não estaria aqui)
- Nota entre 3.5 e 4.5: +2 pontos (ativo mas com espaço pra crescer)
- Nota >= 4.6: +1 ponto (ativo e reputado, pode querer escalar)
- Tem mais de 20 avaliações: +1 ponto (negócio estabelecido)
- Não tem site: +1 ponto (dor clara)
- Reviews com reclamação de atendimento/demora: +2 pontos (dor clara de automação)
- Categoria premium (clínica, imobiliária, escola, academia): +1 ponto
- Score >= 6 = qualificado = true

INSTRUÇÕES PARA A MENSAGEM:
- Tom: informal, direto, como se você tivesse mandado por indicação
- Máximo 3 parágrafos curtos
- Parágrafo 1: gancho baseado em algo REAL da empresa (nota, avaliação específica, ausência de site, volume de reviews)
- Parágrafo 2: 1 dor específica que você identificou + como a Beace resolve objetivamente
- Parágrafo 3: CTA simples e direto — pergunta aberta, sem forçar
- NÃO mencione "marketing digital" de forma genérica
- NÃO use frases como "podemos ajudar a crescer ainda mais" — seja específico
- NÃO assine formalmente — termine com o CTA
- Use no máximo 1 emoji

Retorne SOMENTE este JSON (sem markdown, sem explicação):
{
  "dores": ["dor específica 1 baseada nos dados", "dor específica 2"],
  "servicos": ["serviço da Beace que resolve dor 1", "serviço que resolve dor 2"],
  "mensagem": "mensagem de WhatsApp aqui",
  "score": 7,
  "qualificado": true
}`;

  const raw  = await callAI({ prompt, maxTokens: 1024, claudeModel: "claude-haiku-4-5-20251001" });
  const text = raw.startsWith("```") ? raw.replace(/```[a-z]*\n?/g, "").trim() : raw;

  try {
    return JSON.parse(text) as ProspecaoAnalysis;
  } catch {
    return {
      dores:       ["Dados insuficientes para análise"],
      servicos:    ["Gestão de marketing completa"],
      mensagem:    `Oi! Vi a ${empresa.name} no Google e queria entender como vocês estão captando clientes hoje. Tenho uma ideia que pode funcionar bem pro seu negócio — posso te explicar em 2 minutos?`,
      score:       5,
      qualificado: true,
    };
  }
}
