export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
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

    const db = getAdminDb();
    const tenantId = session.client_id ?? "default";

    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    let query = db.collection("legal_contracts")
      .where("tenant_id", "==", tenantId)
      .orderBy("created_at", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    const snap = await query.get();
    const contracts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, data: contracts });
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

    const db = getAdminDb();
    const tenantId = session.client_id ?? "default";

    // Buscar template
    const templateDoc = await db.collection("legal_templates").doc(template_id).get();
    if (!templateDoc.exists) {
      return NextResponse.json({ success: false, error: "Template não encontrado" }, { status: 404 });
    }
    const templateData = templateDoc.data()!;
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

    const docRef = await db.collection("legal_contracts").add(contractData);

    return NextResponse.json({
      success: true,
      data: { id: docRef.id, ...contractData },
    });
  } catch (err) {
    console.error("[POST /api/juridico/contratos]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
