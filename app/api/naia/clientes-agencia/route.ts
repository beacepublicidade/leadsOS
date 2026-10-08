export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyNaiaKey } from "@/lib/naiaAuth";

export async function GET(req: NextRequest) {
  try {
    const session = await verifyNaiaKey(req);
    if (!session) return NextResponse.json({ success: false, error: "API key inválida" }, { status: 401 });

    if (!session.permissions.includes("clients:read")) {
      return NextResponse.json({ success: false, error: "Permissão negada" }, { status: 403 });
    }

    let query = supabaseAdmin
      .from("agency_clients")
      .select("id, name, niche, responsible, monthly_value, status")
      .eq("status", "ativo")
      .order("created_at", { ascending: false });

    if (session.tenant_id !== "default") {
      query = query.eq("tenant_id", session.tenant_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[NAIA GET /api/naia/clientes-agencia] Supabase error:", error);
      return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("[NAIA GET /api/naia/clientes-agencia]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
