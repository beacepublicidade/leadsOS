export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminDb } from "@/lib/firebase-admin";

// POST /api/auth/register — creates a new user
// ⚠️  In production, protect this endpoint or remove it after setup.
export async function POST(req: NextRequest) {
  try {
    const { email, password, client_id } = await req.json() as {
      email?: string;
      password?: string;
      client_id?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for duplicate
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
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, data: { id: ref.id, email: normalizedEmail, client_id: client_id ?? null } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}
