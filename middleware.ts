import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

// Paths that never require auth
const PUBLIC_PREFIXES = [
  "/login",
  "/lp",
  "/api/auth",
  "/api/webhooks",
  "/api/lp",
  "/_next",
  "/favicon",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const user  = token ? await verifyToken(token) : null;

  // Protect dashboard pages → redirect to /login
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // Protect internal API routes → return 401
  if (pathname.startsWith("/api/")) {
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*", "/login"],
};
