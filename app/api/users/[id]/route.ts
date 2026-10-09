export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

// PATCH /api/users/[id] — edita nome, perfil e/ou senha
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, profile, password, client_id } = await req.json() as {
      name?:      string;
      profile?:   string;
      password?:  string;
      client_id?: string | null;
    };

    const updates: Record<string, unknown> = {};

    if (name      !== undefined) updates.name      = name.trim();
    if (profile   !== undefined) updates.profile   = profile;
    if (client_id !== undefined) updates.client_id = client_id ?? null;
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ success: false, error: "Senha deve ter no mínimo 6 caracteres." }, { status: 400 });
      }
      updates.password = await bcrypt.hash(password, 12);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum campo para atualizar." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("users").update(updates).eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/users/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro ao atualizar usuário." }, { status: 500 });
  }
}

// DELETE /api/users/[id] — remove usuário (apenas admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session?.isAdmin) {
      return NextResponse.json({ success: false, error: "Apenas admins podem excluir usuários." }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from("users").delete().eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/users/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro ao excluir usuário." }, { status: 500 });
  }
}
