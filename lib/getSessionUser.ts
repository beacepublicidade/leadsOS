import { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME, type JWTPayload } from "@/lib/auth";

export interface SessionUser extends JWTPayload {
  isAdmin: boolean; // true if profile==="admin" OR client_id===null (legacy)
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const isAdmin = payload.profile === "admin" || payload.client_id === null;
  return { ...payload, isAdmin };
}
