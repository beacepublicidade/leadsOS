export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// PATCH /api/clients/[id] — edita nome, nicho e/ou whatsapp_number
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const {
      name, niche, whatsapp_number, brand_color,
      facebook_page_id, facebook_page_token,
      lp_headline, lp_subheadline, lp_cta_button, lp_logo_url,
      lp_metrics, lp_dores, lp_beneficios, lp_depoimentos, lp_sobre, lp_sobre_foto,
    } = body as {
      name?:                 string;
      niche?:                string;
      whatsapp_number?:      string;
      brand_color?:          string;
      facebook_page_id?:     string;
      facebook_page_token?:  string;
      lp_headline?:          string;
      lp_subheadline?:       string;
      lp_cta_button?:        string;
      lp_logo_url?:          string;
      lp_metrics?:           unknown[];
      lp_dores?:             string[];
      lp_beneficios?:        string[];
      lp_depoimentos?:       unknown[];
      lp_sobre?:             string;
      lp_sobre_foto?:        string;
      zapi_instance_id?:     string;
      zapi_token?:           string;
      zapi_client_token?:    string;
    };

    const updates: Record<string, unknown> = {};
    if (name                !== undefined) updates.name                = name.trim();
    if (niche               !== undefined) updates.niche               = niche.trim();
    if (whatsapp_number     !== undefined) updates.whatsapp_number     = whatsapp_number.trim();
    if (brand_color         !== undefined) updates.brand_color         = brand_color;
    if (facebook_page_id    !== undefined) updates.facebook_page_id    = facebook_page_id.trim();
    if (facebook_page_token !== undefined) updates.facebook_page_token = facebook_page_token.trim();
    if (lp_headline         !== undefined) updates.lp_headline         = lp_headline.trim();
    if (lp_subheadline      !== undefined) updates.lp_subheadline      = lp_subheadline.trim();
    if (lp_cta_button       !== undefined) updates.lp_cta_button       = lp_cta_button.trim();
    if (lp_logo_url         !== undefined) updates.lp_logo_url         = lp_logo_url.trim();
    if (lp_metrics          !== undefined) updates.lp_metrics          = lp_metrics;
    if (lp_dores            !== undefined) updates.lp_dores            = lp_dores;
    if (lp_beneficios       !== undefined) updates.lp_beneficios       = lp_beneficios;
    if (lp_depoimentos      !== undefined) updates.lp_depoimentos      = lp_depoimentos;
    if (lp_sobre            !== undefined) updates.lp_sobre            = lp_sobre.trim();
    if (lp_sobre_foto       !== undefined) updates.lp_sobre_foto       = lp_sobre_foto.trim();
    if (body.zapi_instance_id  !== undefined) updates.zapi_instance_id  = (body.zapi_instance_id  as string).trim();
    if (body.zapi_token        !== undefined) updates.zapi_token        = (body.zapi_token        as string).trim();
    if (body.zapi_client_token !== undefined) updates.zapi_client_token = (body.zapi_client_token as string).trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum campo para atualizar." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("clients").update(updates).eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/clients/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro ao atualizar cliente." }, { status: 500 });
  }
}

// DELETE /api/clients/[id] — remove cliente
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin.from("clients").delete().eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/clients/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro ao excluir cliente." }, { status: 500 });
  }
}
