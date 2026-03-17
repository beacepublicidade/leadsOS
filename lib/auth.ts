import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "leadsos_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

export interface JWTPayload {
  email:      string;
  client_id:  string | null;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      email:     payload.email     as string,
      client_id: payload.client_id as string | null,
    };
  } catch {
    return null;
  }
}

export { COOKIE_NAME, COOKIE_MAX_AGE };
