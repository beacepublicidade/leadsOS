export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const tenantId = session.client_id ?? "default";
    const { data, error } = await supabaseAdmin
      .from("legal_templates")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
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

    const tenantId = session.client_id ?? "default";

    // Extrair variáveis do conteúdo automaticamente
    const extractedVars = (content.match(/\{\{([^}]+)\}\}/g) ?? []).map(
      (v: string) => v.replace(/\{\{|\}\}/g, "").trim()
    );

    const { data, error } = await supabaseAdmin.from("legal_templates").insert({
      name,
      type: type || "outros",
      content,
      variables: variables ?? extractedVars,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: { id: data.id, name, type } });
  } catch (err) {
    console.error("[POST /api/juridico/templates]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
