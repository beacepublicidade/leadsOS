export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";
import { searchGoogleMaps, fetchReviews } from "@/services/prospecaoService";
import { analyzeAndGenerateMessage } from "@/services/prospecaoAiService";
import { sendWhatsApp } from "@/services/notificationService";
import { normalizePhone } from "@/lib/normalizePhone";
import { logAction } from "@/services/logsService";
import type { BeaceService } from "@/services/prospecaoAiService";

// POST /api/prospecao — busca empresas, analisa e envia mensagens
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });

    const body = await req.json() as {
      nicho:       string;  // Ex: "escritório de advocacia"
      cidade:      string;  // Ex: "São Paulo SP"
      limite?:     number;  // máx empresas a buscar (default 20)
      modo_oferta?: "automatico" | "pacote";
      client_id?:  string;
      enviar?:     boolean; // se false, só analisa sem enviar
    };

    const { nicho, cidade, limite = 20, modo_oferta = "automatico", enviar = false } = body;
    const client_id = session.isAdmin ? (body.client_id ?? "") : (session.client_id ?? "");

    if (!nicho || !cidade) {
      return NextResponse.json({ success: false, error: "nicho e cidade são obrigatórios." }, { status: 400 });
    }

    // Busca serviços cadastrados (se modo pacote)
    let servicos: BeaceService[] = [];
    if (modo_oferta === "pacote") {
      const { data } = await supabaseAdmin.from("beace_services").select("*");
      servicos = (data ?? []) as BeaceService[];
    }

    // Busca empresas no Google Maps via Outscraper
    const query = `${nicho} em ${cidade}`;
    const empresas = await searchGoogleMaps(query, limite);

    const resultados = [];
    let enviados = 0;

    for (const empresa of empresas) {
      try {
        // Busca avaliações reais da empresa para enriquecer a análise
        const reviews = empresa.data_id ? await fetchReviews(empresa.data_id) : [];

        // Analisa e gera mensagem personalizada
        const analise = await analyzeAndGenerateMessage(empresa, servicos, modo_oferta, reviews);

        if (!analise.qualificado) {
          resultados.push({ empresa: empresa.name, phone: empresa.phone, qualificado: false, score: analise.score });
          continue;
        }

        const phone = normalizePhone(empresa.phone);

        // Verifica duplicata por telefone (qualquer status, qualquer origem)
        const { data: dupData } = await supabaseAdmin.from("leads").select("id").eq("phone", phone).limit(1);

        if (dupData && dupData.length > 0) {
          resultados.push({
            empresa:     empresa.name,
            phone,
            score:       analise.score,
            qualificado: true,
            duplicado:   true,
            lead_id:     dupData[0].id,
          });
          continue;
        }

        // Salva como lead no pipeline
        const { data: newLead, error: leadError } = await supabaseAdmin.from("leads").insert({
          name:           empresa.name,
          phone,
          email:          "",
          source:         "prospeccao_ativa",
          campaign_name:  nicho,
          campaign_id:    "",
          adset_name:     cidade,
          ad_name:        "",
          status:         "novo",
          score:          analise.score * 10,
          ai_reply:       false,
          client_id,
          created_at:     new Date().toISOString(),
          status_changed_at: new Date().toISOString(),
          // Contexto da empresa para o SDR IA usar
          prospeccao_dores:    analise.dores.join(", "),
          prospeccao_servicos: analise.servicos.join(", "),
          prospeccao_empresa:  JSON.stringify({
            address:  empresa.full_address,
            rating:   empresa.rating,
            reviews:  empresa.reviews,
            website:  empresa.website,
            category: empresa.category,
          }),
        }).select().single();

        if (leadError || !newLead) throw leadError;

        // Envia mensagem se solicitado
        if (enviar && phone) {
          try {
            await sendWhatsApp(phone, analise.mensagem);
            await supabaseAdmin.from("leads").update({
              first_response_at: new Date().toISOString(),
              status: "contato",
              status_changed_at: new Date().toISOString(),
            }).eq("id", newLead.id);
            enviados++;
          } catch { /* não bloqueia se falhar envio */ }
        }

        logAction({
          lead_id:    newLead.id,
          type:       "notification",
          message:    `Lead prospectado: ${empresa.name} — Score: ${analise.score}. ${enviar ? "Mensagem enviada." : "Sem envio."}`,
          created_at: new Date().toISOString(),
        }).catch(() => {});

        resultados.push({
          lead_id:     newLead.id,
          empresa:     empresa.name,
          phone,
          score:       analise.score,
          qualificado: true,
          dores:       analise.dores,
          mensagem:    analise.mensagem,
          enviado:     enviar && !!phone,
        });

      } catch (err) {
        resultados.push({ empresa: empresa.name, error: String(err) });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total_encontrados: empresas.length,
        qualificados:      resultados.filter((r) => r.qualificado).length,
        enviados,
        resultados,
      },
    });

  } catch (err) {
    console.error("[POST /api/prospecao]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
