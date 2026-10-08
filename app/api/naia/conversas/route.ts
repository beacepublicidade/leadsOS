export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyNaiaKey } from "@/lib/naiaAuth";

export async function GET(req: NextRequest) {
  try {
    const session = await verifyNaiaKey(req);
    if (!session) return NextResponse.json({ success: false, error: "API key inválida" }, { status: 401 });

    let query = supabaseAdmin
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (session.tenant_id !== "default") {
      query = query.eq("client_id", session.tenant_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[NAIA GET /api/naia/conversas] Supabase error:", error);
      return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("[NAIA GET /api/naia/conversas]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyNaiaKey(req);
    if (!session) return NextResponse.json({ success: false, error: "API key inválida" }, { status: 401 });

    if (!session.permissions.includes("conversations:write")) {
      return NextResponse.json({ success: false, error: "Permissão negada" }, { status: 403 });
    }

    const body = await req.json();
    const { lead_id, phone } = body as { lead_id: string; phone: string };

    if (!lead_id || !phone) {
      return NextResponse.json({ success: false, error: "lead_id e phone obrigatórios" }, { status: 400 });
    }

    const convData = {
      lead_id,
      phone,
      client_id: session.tenant_id !== "default" ? session.tenant_id : "",
      ai_enabled: true,
    };

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .insert(convData)
      .select()
      .single();

    if (error) {
      console.error("[NAIA POST /api/naia/conversas] Supabase error:", error);
      return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("[NAIA POST /api/naia/conversas]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
