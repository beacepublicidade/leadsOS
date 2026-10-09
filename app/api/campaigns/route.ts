export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const session   = await getSessionUser(req);
    const client_id = session?.isAdmin ? null : (session?.client_id ?? null);

    let query = supabaseAdmin.from("campaigns").select("*").limit(50);

    if (client_id) {
      query = query.eq("client_id", client_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const campaigns = (data ?? []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const dateA = new Date((a.created_at as string) ?? 0).getTime();
      const dateB = new Date((b.created_at as string) ?? 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ success: true, campaigns });
  } catch (err) {
    console.error("[GET /api/campaigns]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar campanhas." }, { status: 500 });
  }
}
