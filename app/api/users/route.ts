export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

// GET /api/users — lista usuários (admin vê todos, cliente vê só os seus)
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    const filterClientId = session?.isAdmin
      ? (req.nextUrl.searchParams.get("client_id") ?? null)
      : (session?.client_id ?? null);

    let query = supabaseAdmin
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterClientId) {
      query = query.eq("client_id", filterClientId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const users = (data ?? []).map(({ password: _password, ...rest }) => rest);

    return NextResponse.json({ success: true, data: users }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/users]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar usuários" }, { status: 500 });
  }
}

// POST /api/users — cria um novo usuário
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const { email, password, client_id: bodyClientId, name, profile } = await req.json() as {
      email?:     string;
      password?:  string;
      client_id?: string;
      name?:      string;
      profile?:   string;
    };

    // Não-admins só podem criar usuários dentro do próprio cliente
    const client_id = session?.isAdmin ? (bodyClientId ?? null) : (session?.client_id ?? null);

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email já cadastrado." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    const { data, error } = await supabaseAdmin.from("users").insert({
      email:      normalizedEmail,
      password:   hashed,
      client_id:  client_id ?? null,
      name:       name?.trim() ?? "",
      profile:    profile ?? "vendedor",
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    return NextResponse.json(
      { success: true, data: { id: data.id, email: normalizedEmail, client_id: client_id ?? null } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/users]", err);
    return NextResponse.json({ success: false, error: "Erro ao criar usuário" }, { status: 500 });
  }
}
