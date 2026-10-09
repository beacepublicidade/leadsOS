export const dynamic = "force-dynamic";
// cache-bust: 2026-06-23T

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendWhatsApp } from "@/services/notificationService";
import { saveMessage } from "@/services/conversationService";
import { runStatusAutomation } from "@/services/automationService";
import { logAction } from "@/services/logsService";
import { calculateScore } from "@/services/scoringService";
import { searchGoogleMaps, fetchReviews } from "@/services/prospecaoService";
import { analyzeAndGenerateMessage } from "@/services/prospecaoAiService";
import { normalizePhone } from "@/lib/normalizePhone";

// POST /api/internal/actions — DOMINUS executa ações no LeadsOS
// Protegido por INTERNAL_API_KEY
// Ações que requerem aprovação de Robson retornam { needs_approval: true } sem executar

const VALID_STATUSES = ["novo", "contato", "proposta", "fechado", "perdido"] as const;
type LeadStatus = typeof VALID_STATUSES[number];

// Ações que requerem aprovação explícita de Robson
const APPROVAL_REQUIRED_STATUSES: LeadStatus[] = ["fechado"];

function auth(req: NextRequest): boolean {
  const key = req.headers.get("x-internal-key");
  const normalize = (s: string) => s.replace(/\\n/g, "").replace(/\n/g, "").trim();
  return !!(key && normalize(key) === normalize(process.env.INTERNAL_API_KEY ?? ""));
}

export async function POST(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      action: string;
      lead_id?: string;
      // create_lead
      name?: string;
      phone?: string;
      email?: string;
      source?: string;
      campaign?: string;
      notes?: string;
      // update_status
      status?: LeadStatus;
      reason?: string;
      // send_message
      message?: string;
      agent_name?: string;
      // search_leads
      query?: string;
      filter_status?: string;
      // update_lead
      fields?: Record<string, unknown>;
      // delete_lead
      confirm_delete?: boolean;
      // prospect
      nicho?: string;
      cidade?: string;
      limite?: number;
      enviar?: boolean;
    };

    // ─── CREATE LEAD ─────────────────────────────────────────────────────────
    if (body.action === "create_lead") {
      const { name, phone, email = "", source = "dominus", campaign = "prospeccao-ativa", notes } = body;
      if (!name || !phone) {
        return NextResponse.json({ success: false, error: "name e phone obrigatórios" }, { status: 400 });
      }
      const score = calculateScore({ name, phone, email, source, campaign_name: campaign });
      const { data, error } = await supabaseAdmin.from("leads").insert({
        name,
        phone,
        email,
        source,
        campaign_name: campaign,
        notes: notes ?? "",
        status: "novo",
        score,
        created_by: "DOMINUS",
        created_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      logAction({ lead_id: data.id, type: "automation", message: `Lead criado pelo DOMINUS: ${name}`, created_at: new Date().toISOString() }).catch(() => {});
      return NextResponse.json({ success: true, data: { id: data.id, name, phone, status: "novo" } }, { status: 201 });
    }

    // ─── SEARCH LEADS ────────────────────────────────────────────────────────
    if (body.action === "search_leads") {
      let q = supabaseAdmin.from("leads").select("*").order("created_at", { ascending: false }).limit(20);
      if (body.filter_status) q = q.eq("status", body.filter_status);
      const { data, error } = await q;
      if (error) throw error;
      const leads = (data ?? []) as Record<string, unknown>[];
      const filtered = body.query
        ? leads.filter(l => {
            const qStr = body.query!.toLowerCase();
            return (
              String(l.name ?? "").toLowerCase().includes(qStr) ||
              String(l.phone ?? "").includes(qStr) ||
              String(l.email ?? "").toLowerCase().includes(qStr)
            );
          })
        : leads;
      return NextResponse.json({ success: true, data: filtered });
    }

    // ─── GET LEAD ────────────────────────────────────────────────────────────
    if (body.action === "get_lead") {
      if (!body.lead_id) return NextResponse.json({ success: false, error: "lead_id obrigatório" }, { status: 400 });
      const { data, error } = await supabaseAdmin.from("leads").select("*").eq("id", body.lead_id).single();
      if (error || !data) return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 });
      return NextResponse.json({ success: true, data });
    }

    // ─── UPDATE LEAD ─────────────────────────────────────────────────────────
    if (body.action === "update_lead") {
      if (!body.lead_id) return NextResponse.json({ success: false, error: "lead_id obrigatório" }, { status: 400 });
      const allowedFields = ["name", "phone", "email", "notes", "campaign_name", "source", "score"];
      const update: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: "DOMINUS" };
      for (const [k, v] of Object.entries(body.fields ?? {})) {
        if (allowedFields.includes(k)) update[k] = v;
      }
      const { error } = await supabaseAdmin.from("leads").update(update).eq("id", body.lead_id);
      if (error) throw error;
      logAction({ lead_id: body.lead_id, type: "automation", message: `Lead atualizado pelo DOMINUS`, created_at: new Date().toISOString() }).catch(() => {});
      return NextResponse.json({ success: true, data: { id: body.lead_id, updated: Object.keys(update) } });
    }

    // ─── UPDATE STATUS ───────────────────────────────────────────────────────
    if (body.action === "update_status") {
      if (!body.lead_id || !body.status) return NextResponse.json({ success: false, error: "lead_id e status obrigatórios" }, { status: 400 });
      if (!VALID_STATUSES.includes(body.status)) return NextResponse.json({ success: false, error: `Status inválido: ${body.status}` }, { status: 400 });

      // Fechamento requer aprovação de Robson
      if (APPROVAL_REQUIRED_STATUSES.includes(body.status)) {
        return NextResponse.json({
          success: false,
          needs_approval: true,
          action: "update_status",
          lead_id: body.lead_id,
          requested_status: body.status,
          reason: body.reason ?? "",
          message: `Mover lead para "${body.status}" requer aprovação de Robson.`,
        });
      }

      const { data: leadData, error: fetchError } = await supabaseAdmin
        .from("leads")
        .select("*")
        .eq("id", body.lead_id)
        .single();

      if (fetchError || !leadData) return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 });

      const update: Record<string, string> = { status: body.status, status_changed_at: new Date().toISOString(), updated_by: "DOMINUS" };
      if (leadData.status === "novo" && body.status !== "novo" && !leadData.first_response_at) {
        update.first_response_at = new Date().toISOString();
      }

      const { error: updateError } = await supabaseAdmin.from("leads").update(update).eq("id", body.lead_id);
      if (updateError) throw updateError;

      logAction({ lead_id: body.lead_id, type: "status_change", message: `DOMINUS: "${leadData.status ?? "?"}" → "${body.status}"${body.reason ? ` (${body.reason})` : ""}`, created_at: new Date().toISOString() }).catch(() => {});
      if (leadData.name && leadData.phone) {
        runStatusAutomation(body.status, { name: leadData.name, phone: leadData.phone }).catch(() => {});
      }
      return NextResponse.json({ success: true, data: { id: body.lead_id, previous_status: leadData.status, new_status: body.status } });
    }

    // ─── SEND MESSAGE ────────────────────────────────────────────────────────
    if (body.action === "send_message") {
      if (!body.lead_id || !body.message) return NextResponse.json({ success: false, error: "lead_id e message obrigatórios" }, { status: 400 });
      const { data: lead, error: leadError } = await supabaseAdmin.from("leads").select("*").eq("id", body.lead_id).single();
      if (leadError || !lead) return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 });
      if (!lead.phone) return NextResponse.json({ success: false, error: "Lead sem telefone" }, { status: 400 });

      const waId = await sendWhatsApp(lead.phone, body.message);
      await saveMessage({
        lead_id: body.lead_id,
        phone: lead.phone,
        direction: "out",
        content: body.message,
        timestamp: new Date().toISOString(),
        sender_name: body.agent_name ?? "DOMINUS",
        zapi_id: waId ?? undefined,
      });
      logAction({ lead_id: body.lead_id, type: "notification", message: `DOMINUS enviou mensagem para ${lead.name}`, created_at: new Date().toISOString() }).catch(() => {});
      return NextResponse.json({ success: true, data: { lead_id: body.lead_id, message_sent: body.message, whatsapp_id: waId } });
    }

    // ─── ADD NOTE ────────────────────────────────────────────────────────────
    if (body.action === "add_note") {
      if (!body.lead_id || !body.message) return NextResponse.json({ success: false, error: "lead_id e message obrigatórios" }, { status: 400 });
      const { error } = await supabaseAdmin.from("leads").update({
        notes: body.message,
        notes_updated_at: new Date().toISOString(),
        notes_by: body.agent_name ?? "DOMINUS",
      }).eq("id", body.lead_id);
      if (error) throw error;
      logAction({ lead_id: body.lead_id, type: "automation", message: `Nota adicionada: ${body.message.slice(0, 80)}`, created_at: new Date().toISOString() }).catch(() => {});
      return NextResponse.json({ success: true, data: { lead_id: body.lead_id } });
    }

    // ─── DELETE LEAD (sempre requer aprovação) ───────────────────────────────
    if (body.action === "delete_lead") {
      return NextResponse.json({
        success: false,
        needs_approval: true,
        action: "delete_lead",
        lead_id: body.lead_id,
        message: "Deletar lead sempre requer aprovação de Robson.",
      });
    }

    // ─── PROSPECT (prospecção ativa via Google Maps + IA) ────────────────────
    if (body.action === "prospect") {
      const nicho   = body.nicho   as string | undefined;
      const cidade  = body.cidade  as string | undefined;
      const limite  = (body.limite  as number | undefined) ?? 10;
      const enviar  = (body.enviar  as boolean | undefined) ?? false;

      if (!nicho || !cidade) {
        return NextResponse.json({ success: false, error: "nicho e cidade obrigatórios" }, { status: 400 });
      }

      const empresas = await searchGoogleMaps(`${nicho} em ${cidade}`, limite);
      const resultados = [];
      let enviados = 0;

      for (const empresa of empresas) {
        try {
          const reviews = empresa.data_id ? await fetchReviews(empresa.data_id) : [];
          const analise = await analyzeAndGenerateMessage(empresa, [], "automatico", reviews);

          if (!analise.qualificado) {
            resultados.push({ empresa: empresa.name, qualificado: false, score: analise.score });
            continue;
          }

          const phone = normalizePhone(empresa.phone);
          const { data: dupLead } = await supabaseAdmin.from("leads").select("id").eq("phone", phone).limit(1).single();
          if (dupLead) {
            resultados.push({ empresa: empresa.name, phone, qualificado: true, duplicado: true, lead_id: dupLead.id });
            continue;
          }

          const { data: newLead, error: insertError } = await supabaseAdmin.from("leads").insert({
            name: empresa.name, phone, email: "", source: "prospeccao_ativa",
            campaign_name: nicho, status: "novo", score: analise.score * 10,
            created_by: "DOMINUS", created_at: new Date().toISOString(),
            prospeccao_dores: analise.dores.join(", "),
            prospeccao_servicos: analise.servicos.join(", "),
            prospeccao_empresa: JSON.stringify({ address: empresa.full_address, rating: empresa.rating, reviews: empresa.reviews }),
          }).select().single();
          if (insertError) throw insertError;

          if (enviar && phone) {
            try {
              await sendWhatsApp(phone, analise.mensagem);
              await saveMessage({ lead_id: newLead.id, phone, direction: "out", content: analise.mensagem, timestamp: new Date().toISOString(), sender_name: "DOMINUS SDR" });
              await supabaseAdmin.from("leads").update({ status: "contato", first_response_at: new Date().toISOString() }).eq("id", newLead.id);
              enviados++;
            } catch { /* não bloqueia */ }
          }

          logAction({ lead_id: newLead.id, type: "automation", message: `DOMINUS prospectou: ${empresa.name} (score ${analise.score})`, created_at: new Date().toISOString() }).catch(() => {});
          resultados.push({ lead_id: newLead.id, empresa: empresa.name, phone, score: analise.score, qualificado: true, dores: analise.dores, mensagem: analise.mensagem, enviado: enviar && !!phone });
        } catch (err) {
          resultados.push({ empresa: empresa.name, error: String(err) });
        }
      }

      return NextResponse.json({
        success: true,
        data: { total_encontrados: empresas.length, qualificados: resultados.filter(r => r.qualificado).length, enviados, resultados },
      });
    }

    return NextResponse.json({ success: false, error: `Ação desconhecida: ${body.action}` }, { status: 400 });

  } catch (err) {
    console.error("[POST /api/internal/actions]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
