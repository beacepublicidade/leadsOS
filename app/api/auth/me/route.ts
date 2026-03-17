import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
  }

  return NextResponse.json({ success: true, user });
}
