export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

// GET /api/prospecao/services — lista serviços da Beace cadastrados
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });

    const { data, error } = await supabaseAdmin.from("beace_services").select("*").order("created_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/prospecao/services]", err);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}

// POST /api/prospecao/services — cadastra novo serviço
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });

    const { name, description } = await req.json() as { name: string; description: string };
    if (!name || !description) return NextResponse.json({ success: false, error: "name e description obrigatórios." }, { status: 400 });

    const { data, error } = await supabaseAdmin.from("beace_services").insert({
      name:       name.trim(),
      description: description.trim(),
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: { id: data.id } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/prospecao/services]", err);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}

// DELETE /api/prospecao/services?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "id obrigatório." }, { status: 400 });

    const { error } = await supabaseAdmin.from("beace_services").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/prospecao/services]", err);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}
