export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { saveMetaLead } from "@/services/metaLeadsService";

// GET /api/webhooks/meta — verificação do webhook pelo Meta (Facebook)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WEBHOOK_SECRET && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// POST /api/webhooks/meta — recebe leads do Meta Lead Ads (formato nativo Facebook)
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // ── Verificação de assinatura HMAC-SHA256 (padrão oficial do Facebook) ──────
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (appSecret) {
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const expected  = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    if (signature !== expected) {
      console.warn("[META WEBHOOK] Assinatura inválida — possível requisição não autorizada.");
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 });
  }

  // O Facebook sempre envia object: "page"
  if (body.object !== "page") {
    return NextResponse.json({ success: true }); // ignorar outros eventos
  }

  const entries = (body.entry as Record<string, unknown>[] | undefined) ?? [];
  const results: string[] = [];

  for (const entry of entries) {
    const changes = (entry.changes as Record<string, unknown>[] | undefined) ?? [];

    for (const change of changes) {
      if (change.field !== "leadgen") continue;

      const value     = change.value as Record<string, unknown>;
      const leadgenId = value.leadgen_id as string | undefined;
      const pageId    = value.page_id    as string | undefined;

      if (!leadgenId || !pageId) continue;

      try {
        const id = await processMetaLead(leadgenId, pageId, value);
        if (id) results.push(id);
      } catch (err) {
        console.error("[META WEBHOOK] Erro ao processar lead:", leadgenId, err);
      }
    }
  }

  return NextResponse.json({ success: true, processed: results.length });
}

async function processMetaLead(
  leadgenId: string,
  pageId: string,
  meta: Record<string, unknown>
): Promise<string | null> {
  // ── Busca o cliente pelo facebook_page_id cadastrado ─────────────────────
  const { data: clientData } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("facebook_page_id", pageId)
    .limit(1)
    .single();

  const clientId    = clientData?.id ?? "";
  const pageToken   = (clientData?.facebook_page_token as string | undefined) ?? process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "";

  // ── Busca os dados do lead na Graph API ──────────────────────────────────
  let name = "", phone = "", email = "";
  let campaignName = (meta.campaign_name as string | undefined) ?? "";
  let campaignId   = (meta.campaign_id   as string | undefined) ?? "";
  let adsetName    = (meta.adset_name    as string | undefined) ?? "";
  let adName       = (meta.ad_name       as string | undefined) ?? "";
  const adId       = (meta.ad_id         as string | undefined) ?? "";
  const formId     = (meta.form_id       as string | undefined) ?? "";

  if (pageToken) {
    try {
      const fields = "field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,created_time";
      const url    = `https://graph.facebook.com/v19.0/${leadgenId}?fields=${fields}&access_token=${pageToken}`;
      const res    = await fetch(url);
      const data   = await res.json() as Record<string, unknown>;

      if (data.error) {
        console.error("[META WEBHOOK] Erro Graph API:", data.error);
      } else {
        const fieldData = (data.field_data as { name: string; values: string[] }[] | undefined) ?? [];
        for (const f of fieldData) {
          const val = f.values?.[0] ?? "";
          const key = f.name.toLowerCase();
          if (key === "full_name"    || key === "name")  name  = val;
          if (key === "phone_number" || key === "phone") phone = val;
          if (key === "email")                           email = val;
        }
        campaignName = (data.campaign_name as string | undefined) ?? campaignName;
        campaignId   = (data.campaign_id   as string | undefined) ?? campaignId;
        adsetName    = (data.adset_name    as string | undefined) ?? adsetName;
        adName       = (data.ad_name       as string | undefined) ?? adName;
      }
    } catch (err) {
      console.error("[META WEBHOOK] Falha ao chamar Graph API:", err);
    }
  } else {
    console.warn(`[META WEBHOOK] Sem page_token para page_id=${pageId} — lead salvo sem dados de campo`);
  }

  if (!name) {
    console.warn("[META WEBHOOK] Lead sem nome, ignorando:", leadgenId);
    return null;
  }

  return saveMetaLead({
    name,
    phone,
    email,
    source:        "meta_ads",
    campaign_name: campaignName,
    campaign_id:   campaignId,
    adset_name:    adsetName,
    ad_name:       adName,
    ad_id:         adId,
    form_id:       formId,
    client_id:     clientId,
    fbclid:        leadgenId,
    utm_source:    "facebook",
    utm_medium:    "cpc",
    utm_campaign:  campaignName,
  });
}
