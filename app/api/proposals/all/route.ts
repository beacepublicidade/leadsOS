export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

// GET /api/proposals/all — lista todas as propostas (admin) ou do cliente (gestor/vendedor)
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const client_id = session.isAdmin
      ? (searchParams.get("client_id") || null)
      : (session.client_id ?? null);

    let query = supabaseAdmin
      .from("proposals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (client_id) query = query.eq("client_id", client_id);

    const { data: rawProposals, error } = await query;
    if (error) throw error;

    const proposals = rawProposals ?? [];

    // Enriquece com nome do lead — batch via .in()
    const leadIds = Array.from(new Set(proposals.map((p) => p.lead_id as string).filter(Boolean)));
    const leadMap: Record<string, { name: string; phone: string }> = {};

    if (leadIds.length > 0) {
      const { data: leads } = await supabaseAdmin
        .from("leads")
        .select("id,name,phone")
        .in("id", leadIds);

      for (const lead of leads ?? []) {
        leadMap[lead.id] = { name: lead.name ?? "—", phone: lead.phone ?? "" };
      }
    }

    const enriched = proposals.map((p) => {
      const lead = leadMap[p.lead_id as string];
      return { ...p, lead_name: lead?.name ?? "—", lead_phone: lead?.phone ?? "" };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (err) {
    console.error("[GET /api/proposals/all]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar propostas." }, { status: 500 });
  }
}
