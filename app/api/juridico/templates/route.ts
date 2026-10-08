export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const db = getAdminDb();
    const tenantId = session.client_id ?? "default";
    const snap = await db.collection("legal_templates")
      .where("tenant_id", "==", tenantId)
      .orderBy("created_at", "desc")
      .get();

    const templates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, data: templates });
  } catch (err) {
    console.error("[GET /api/juridico/templates]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { name, type, content, variables } = body as {
      name: string; type: string; content: string; variables?: string[];
    };

    if (!name || !content) {
      return NextResponse.json({ success: false, error: "Nome e conteúdo obrigatórios" }, { status: 400 });
    }

    const db = getAdminDb();
    const tenantId = session.client_id ?? "default";

    // Extrair variáveis do conteúdo automaticamente
    const extractedVars = (content.match(/\{\{([^}]+)\}\}/g) ?? []).map(
      (v: string) => v.replace(/\{\{|\}\}/g, "").trim()
    );

    const docRef = await db.collection("legal_templates").add({
      name,
      type: type || "outros",
      content,
      variables: variables ?? extractedVars,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: { id: docRef.id, name, type } });
  } catch (err) {
    console.error("[POST /api/juridico/templates]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
