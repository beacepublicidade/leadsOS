import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminDb } from "@/lib/firebase-admin";
import { signToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Step 1: parse body
    const body     = await req.json();
    const email    = body.email    as string | undefined;
    const password = body.password as string | undefined;

    console.log("LOGIN START", { email });

    if (!email || !password) {
      return NextResponse.json(
        { error: "debug", message: "Missing email or password" },
        { status: 400 }
      );
    }

    // Step 2: query Firestore
    const snap = await getAdminDb()
      .collection("users")
      .where("email", "==", email.toLowerCase().trim())
      .limit(1)
      .get();

    if (snap.empty) {
      console.log("USER NOT FOUND", { email });
      return NextResponse.json(
        { error: "debug", message: "User not found for email: " + email },
        { status: 401 }
      );
    }

    const userData = snap.docs[0].data() as {
      email:      string;
      password:   string;
      client_id?: string;
    };

    console.log("USER FOUND", { email: userData.email, client_id: userData.client_id });
    console.log("PASSWORD TYPE", userData.password.startsWith("$2") ? "bcrypt" : "plain");

    // Step 3: check password
    console.log("CHECKING PASSWORD");

    let valid: boolean;
    if (userData.password.startsWith("$2")) {
      valid = await bcrypt.compare(password, userData.password);
    } else {
      valid = password === userData.password;
    }

    if (!valid) {
      console.log("INVALID PASSWORD for", { email });
      return NextResponse.json(
        { error: "debug", message: "Invalid password" },
        { status: 401 }
      );
    }

    // Step 4: sign token and return
    const token = await signToken({
      email:     userData.email,
      client_id: userData.client_id ?? null,
    });

    console.log("LOGIN SUCCESS", { email: userData.email });

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

  } catch (error: any) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json(
      {
        error:   "debug",
        message: error.message,
        stack:   error.stack,
      },
      { status: 500 }
    );
  }
}
