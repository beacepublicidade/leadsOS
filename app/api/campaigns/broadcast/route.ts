export const dynamic = "force-dynamic";

import { NextRequest, NextResponse }  from "next/server";
import { supabaseAdmin }               from "@/lib/supabase-admin";
import { getSessionUser }              from "@/lib/getSessionUser";
import { sendWhatsApp, sendWhatsAppMedia } from "@/services/notificationService";
import { saveMessage }                 from "@/services/conversationService";
import { logAction }                   from "@/services/logsService";
import { Resend }                      from "resend";

const INTERVAL_MS = 30_000; // 30s entre mensagens

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const body    = await req.json() as {
      lead_ids:        string[];
      channel:         "whatsapp" | "email" | "both";
      whatsapp_copy:   string;
      email_subject:   string;
      email_body:      string;
      campaign_name:   string;
      client_id?:      string;
      flyer_base64?:   string; // base64 sem prefixo data:...
      flyer_filename?: string;
    };

    const { lead_ids, channel, whatsapp_copy, email_subject, email_body, campaign_name,
            flyer_base64, flyer_filename } = body;
    const client_id = session?.isAdmin ? (body.client_id || null) : (session?.client_id ?? null);

    if (!lead_ids?.length)      return NextResponse.json({ success: false, error: "Nenhum lead selecionado." }, { status: 400 });
    if (!whatsapp_copy?.trim() && (channel === "whatsapp" || channel === "both"))
      return NextResponse.json({ success: false, error: "Texto do WhatsApp obrigatório." }, { status: 400 });

    // Salva registro da campanha
    const { data: campaignData, error: campaignError } = await supabaseAdmin.from("campaigns").insert({
      name:          campaign_name || `Campanha ${new Date().toLocaleDateString("pt-BR")}`,
      channel,
      lead_ids,
      whatsapp_copy,
      email_subject,
      email_body,
      client_id,
      status:        "sending",
      sent:          0,
      failed:        0,
      created_at:    new Date().toISOString(),
      created_by:    session?.email ?? "sistema",
    }).select().single();
    if (campaignError) throw campaignError;

    const campaignId = campaignData.id;

    // Busca dados dos leads via .in()
    const { data: leadsData } = await supabaseAdmin.from("leads").select("*").in("id", lead_ids);
    const leads = leadsData ?? [];

    const resend = new Resend(process.env.RESEND_API_KEY);
    let sent = 0, failed = 0;

    for (const lead of leads) {
      const firstName = (lead.name ?? "").split(" ")[0] || "cliente";
      const waText    = whatsapp_copy.replace(/\{nome\}/gi, firstName);
      const emailText = email_body.replace(/\{nome\}/gi, firstName);

      try {
        // WhatsApp
        if ((channel === "whatsapp" || channel === "both") && lead.phone) {
          if (flyer_base64 && flyer_filename) {
            // Envia imagem com caption
            await sendWhatsAppMedia(lead.phone, flyer_base64, flyer_filename, "image");
            // Envia o texto separado logo após (Evolution não suporta caption em sendMedia)
            if (waText) await sendWhatsApp(lead.phone, waText);
          } else {
            await sendWhatsApp(lead.phone, waText);
          }
          await saveMessage({
            lead_id:     lead.id,
            phone:       lead.phone,
            direction:   "out",
            content:     waText,
            timestamp:   new Date().toISOString(),
            sender_name: `Campanha: ${campaign_name || "Remarketing"}`,
            status:      "sent",
          });
          await logAction({
            lead_id:    lead.id,
            type:       "automation",
            message:    `Campanha "${campaign_name}" enviada via WhatsApp.`,
            created_at: new Date().toISOString(),
          });
        }

        // Email
        if ((channel === "email" || channel === "both") && lead.email) {
          // Cria registro para tracking antes de enviar
          const { data: trackData, error: trackError } = await supabaseAdmin.from("email_sends").insert({
            lead_id:    lead.id,
            email:      lead.email,
            campaign_id: campaignId,
            subject:    email_subject || "Uma mensagem especial para você",
            opened:     false,
            open_count: 0,
            sent_at:    new Date().toISOString(),
          }).select().single();
          if (trackError) throw trackError;

          const baseUrl   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://leads-os.vercel.app";
          const pixelUrl  = `${baseUrl}/api/track/open/${trackData.id}`;
          const htmlBody  = `<p>${emailText.replace(/\n/g, "<br>")}</p><img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;

          await resend.emails.send({
            from:    process.env.RESEND_FROM ?? "LeadsOS <noreply@leadsOS.com.br>",
            to:      lead.email,
            subject: email_subject || "Uma mensagem especial para você",
            html:    htmlBody,
          });
          await logAction({
            lead_id:    lead.id,
            type:       "automation",
            message:    `Campanha "${campaign_name}" enviada via Email para ${lead.email}.`,
            created_at: new Date().toISOString(),
          });
        }

        sent++;
      } catch (err) {
        console.error(`[Broadcast] Erro no lead ${lead.id}:`, err);
        failed++;
      }

      // Rate limit — aguarda entre disparos
      if (leads.indexOf(lead) < leads.length - 1) {
        await sleep(INTERVAL_MS);
      }
    }

    await supabaseAdmin.from("campaigns").update({ status: "done", sent, failed, finished_at: new Date().toISOString() }).eq("id", campaignId);

    return NextResponse.json({ success: true, sent, failed, campaign_id: campaignId });
  } catch (err) {
    console.error("[POST /api/campaigns/broadcast]", err);
    return NextResponse.json({ success: false, error: "Erro ao disparar campanha." }, { status: 500 });
  }
}
