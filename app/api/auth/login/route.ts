import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminDb } from "@/lib/firebase-admin";
import { signToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body     = await req.json();
    const email    = body.email    as string | undefined;
    const password = body.password as string | undefined;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const snap = await getAdminDb()
      .collection("users")
      .where("email", "==", email.toLowerCase().trim())
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    const userData = snap.docs[0].data() as {
      email:      string;
      password:   string;
      client_id?: string;
    };

    if (!userData.password.startsWith("$2")) {
      // Senha não está hasheada — conta inválida, não autenticar
      console.error(`[LeadsOS] Usuário ${email} tem senha sem hash. Recuse login e corrija no banco.`);
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, userData.password);

    if (!valid) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    const token = await signToken({
      email:     userData.email,
      client_id: userData.client_id ?? null,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        email:     userData.email,
        client_id: userData.client_id ?? null,
      },
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge:   COOKIE_MAX_AGE,
      path:     "/",
    });

    return res;

  } catch (error: unknown) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
