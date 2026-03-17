export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * GET /api/setup-admin?token=leadsOS2024
 * Rota temporária para criar o primeiro usuário admin.
 * APAGAR após o primeiro uso.
 */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");

  if (token !== "leadsOS2024") {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const email    = "contato.beace@gmail.com";
  const password = "Servos28";

  try {
    const db = getAdminDb();

    const existing = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ success: true, message: "Usuário já existe. Pode fazer login normalmente." });
    }

    const hashed = await bcrypt.hash(password, 12);

    await db.collection("users").add({
      email,
      password:   hashed,
      client_id:  null,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Admin criado com sucesso! Acesse /login para entrar." });

  } catch (err) {
    console.error("[setup-admin]", err);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}
