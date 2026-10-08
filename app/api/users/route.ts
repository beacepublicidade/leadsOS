export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

// GET /api/users — lista usuários (admin vê todos, cliente vê só os seus)
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    const filterClientId = session?.isAdmin
      ? (req.nextUrl.searchParams.get("client_id") ?? null)
      : (session?.client_id ?? null);

    let query = getAdminDb()
      .collection("users")
      .orderBy("created_at", "desc") as FirebaseFirestore.Query;

    if (filterClientId) {
      query = query.where("client_id", "==", filterClientId);
    }

    const snap = await query.get();

    const users = snap.docs.map((doc) => {
      const { password: _password, ...rest } = doc.data() as Record<string, unknown>;
      return { id: doc.id, ...rest };
    });

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

    const existing = await getAdminDb()
      .collection("users")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { success: false, error: "Email já cadastrado." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    const ref = await getAdminDb().collection("users").add({
      email:      normalizedEmail,
      password:   hashed,
      client_id:  client_id ?? null,
      name:       name?.trim() ?? "",
      profile:    profile ?? "vendedor",
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, data: { id: ref.id, email: normalizedEmail, client_id: client_id ?? null } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/users]", err);
    return NextResponse.json({ success: false, error: "Erro ao criar usuário" }, { status: 500 });
  }
}
