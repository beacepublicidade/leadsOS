export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { randomBytes } from "crypto";

/**
 * POST /api/portal/token  { client_id }
 * Gera (ou retorna existente) o portal_token do cliente.
 */
export async function POST(req: NextRequest) {
  try {
    const { client_id } = await req.json() as { client_id: string };
    if (!client_id) return NextResponse.json({ error: "client_id obrigatório." }, { status: 400 });

    const { data, error } = await supabaseAdmin.from("clients").select("id,portal_token").eq("id", client_id).single();
    if (error || !data) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    let token = data.portal_token as string | undefined;
    if (!token) {
      token = randomBytes(24).toString("hex");
      await supabaseAdmin.from("clients").update({ portal_token: token }).eq("id", client_id);
    }

    return NextResponse.json({ success: true, token });
  } catch (err) {
    console.error("[POST /api/portal/token]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
