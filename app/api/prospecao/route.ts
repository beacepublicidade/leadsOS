export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
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
      const snapS = await getAdminDb().collection("beace_services").get();
      servicos = snapS.docs.map((d) => ({ id: d.id, ...d.data() })) as BeaceService[];
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
        const dupSnap = await getAdminDb().collection("leads")
          .where("phone", "==", phone)
          .limit(1)
          .get();

        if (!dupSnap.empty) {
          resultados.push({
            empresa:     empresa.name,
            phone,
            score:       analise.score,
            qualificado: true,
            duplicado:   true,
            lead_id:     dupSnap.docs[0].id,
          });
          continue;
        }

        // Salva como lead no pipeline
        const leadRef = await getAdminDb().collection("leads").add({
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
        });

        // Envia mensagem se solicitado
        if (enviar && phone) {
          try {
            await sendWhatsApp(phone, analise.mensagem);
            await getAdminDb().collection("leads").doc(leadRef.id).update({
              first_response_at: new Date().toISOString(),
              status: "contato",
              status_changed_at: new Date().toISOString(),
            });
            enviados++;
          } catch { /* não bloqueia se falhar envio */ }
        }

        logAction({
          lead_id:    leadRef.id,
          type:       "notification",
          message:    `Lead prospectado: ${empresa.name} — Score: ${analise.score}. ${enviar ? "Mensagem enviada." : "Sem envio."}`,
          created_at: new Date().toISOString(),
        }).catch(() => {});

        resultados.push({
          lead_id:     leadRef.id,
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
