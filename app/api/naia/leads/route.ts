export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyNaiaKey } from "@/lib/naiaAuth";

export async function GET(req: NextRequest) {
  try {
    const session = await verifyNaiaKey(req);
    if (!session) return NextResponse.json({ success: false, error: "API key inválida ou rate limit excedido" }, { status: 401 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") ?? "50");
    const offset = parseInt(url.searchParams.get("offset") ?? "0");

    let query = supabaseAdmin
      .from("leads")
      .select("id, name, email, phone, status, score, source, campaign_name, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (session.tenant_id !== "default") {
      query = query.eq("client_id", session.tenant_id);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[NAIA GET /api/naia/leads] Supabase error:", error);
      return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [], total: count ?? (data?.length ?? 0) });
  } catch (err) {
    console.error("[NAIA GET /api/naia/leads]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyNaiaKey(req);
    if (!session) return NextResponse.json({ success: false, error: "API key inválida" }, { status: 401 });

    if (!session.permissions.includes("leads:write")) {
      return NextResponse.json({ success: false, error: "Permissão negada" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, source, status, campaign_name, notes } = body as {
      name: string; email?: string; phone?: string; source?: string;
      status?: string; campaign_name?: string; notes?: string;
    };

    if (!name) {
      return NextResponse.json({ success: false, error: "Nome obrigatório" }, { status: 400 });
    }

    const leadData = {
      name,
      email: email ?? "",
      phone: phone ?? "",
      source: source ?? "naia",
      status: status ?? "novo",
      score: 0,
      campaign_name: campaign_name ?? "",
      notes: notes ?? "",
      client_id: session.tenant_id !== "default" ? session.tenant_id : "",
    };

    const { data, error } = await supabaseAdmin
      .from("leads")
      .insert(leadData)
      .select()
      .single();

    if (error) {
      console.error("[NAIA POST /api/naia/leads] Supabase error:", error);
      return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("[NAIA POST /api/naia/leads]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
