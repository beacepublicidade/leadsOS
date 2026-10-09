export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";
import { createSignatureDocument } from "@/services/autentiqueService";

function fillTemplate(content: string, vars: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const tenantId = session.client_id ?? "default";
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    let query = supabaseAdmin
      .from("legal_contracts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/juridico/contratos]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { client_id, client_name, template_id, variables, value } = body as {
      client_id: string;
      client_name: string;
      template_id: string;
      variables: Record<string, string>;
      value?: number;
    };

    if (!client_id || !template_id) {
      return NextResponse.json({ success: false, error: "Cliente e template obrigatórios" }, { status: 400 });
    }

    const tenantId = session.client_id ?? "default";

    // Buscar template
    const { data: templateData, error: templateError } = await supabaseAdmin
      .from("legal_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (templateError || !templateData) {
      return NextResponse.json({ success: false, error: "Template não encontrado" }, { status: 404 });
    }

    const filledContent = fillTemplate(templateData.content as string, variables ?? {});

    // Gerar PDF base64 simples (texto puro em base64 para envio ao Autentique)
    const pdfBase64 = Buffer.from(filledContent, "utf-8").toString("base64");

    let autentiqueId = "";
    let signLink = "";
    let contractStatus = "rascunho";

    // Tentar enviar para Autentique
    try {
      const result = await createSignatureDocument({
        title: `Contrato - ${client_name}`,
        pdfBase64,
        signerName: client_name,
      });
      autentiqueId = result.documentId;
      signLink = result.signLink;
      contractStatus = "aguardando_assinatura";
    } catch (autErr) {
      console.warn("[POST /api/juridico/contratos] Autentique falhou, salvando como rascunho:", autErr);
    }

    const contractData = {
      client_id,
      client_name,
      template_id,
      template_name: templateData.name as string,
      filled_content: filledContent,
      variables: variables ?? {},
      status: contractStatus,
      value: value ?? 0,
      autentique_id: autentiqueId,
      sign_link: signLink,
      pdf_url: "",
      signed_at: "",
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin.from("legal_contracts").insert(contractData).select().single();
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[POST /api/juridico/contratos]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
