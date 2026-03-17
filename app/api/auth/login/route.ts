import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminDb } from "@/lib/firebase-admin";
import { signToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let email: string | undefined;
  let password: string | undefined;

  // Step 1: parse body
  try {
    const body = await req.json();
    email    = body.email;
    password = body.password;
  } catch (err: any) {
    return NextResponse.json(
      { error: "debug", message: "Failed to parse request body: " + err.message },
      { status: 400 }
    );
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: "debug", message: "Missing email or password" },
      { status: 400 }
    );
  }

  // Step 2: query Firestore
  let userData: { email: string; password: string; client_id?: string } | null = null;

  try {
    const snap = await getAdminDb()
      .collection("users")
      .where("email", "==", email.toLowerCase().trim())
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { error: "debug", message: "User not found for email: " + email },
        { status: 401 }
      );
    }

    userData = snap.docs[0].data() as { email: string; password: string; client_id?: string };
  } catch (err: any) {
    console.error("[login] Firestore query error:", err);
    return NextResponse.json(
      { error: "debug", message: "Firestore error: " + err.message },
      { status: 500 }
    );
  }

  // Step 3: check password
  try {
    let valid: boolean;
    if (userData.password.startsWith("$2")) {
      valid = await bcrypt.compare(password, userData.password);
    } else {
      valid = password === userData.password;
    }

    if (!valid) {
      return NextResponse.json(
        { error: "debug", message: "Invalid password" },
        { status: 401 }
      );
    }
  } catch (err: any) {
    console.error("[login] Password check error:", err);
    return NextResponse.json(
      { error: "debug", message: "Password check error: " + err.message },
      { status: 500 }
    );
  }

  // Step 4: sign token and return
  try {
    const token = await signToken({
      email:     userData.email,
      client_id: userData.client_id ?? null,
    });

    const res = NextResponse.json({
      success:   true,
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
  } catch (err: any) {
    console.error("[login] Token sign error:", err);
    return NextResponse.json(
      { error: "debug", message: "Token error: " + err.message },
      { status: 500 }
    );
  }
}
