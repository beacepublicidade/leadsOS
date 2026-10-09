export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/pixel?cid=CLIENT_ID&url=PAGE_URL — pixel de rastreamento para sites externos
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const cid = searchParams.get("cid");
    const url = searchParams.get("url") ?? "";

    if (cid) {
      // Non-critical tracking — handle error gracefully
      await supabaseAdmin.from("pixel_hits").insert({
        client_id:  cid,
        page_url:   url.slice(0, 500),
        referrer:   req.headers.get("referer") ?? "",
        user_agent: req.headers.get("user-agent") ?? "",
        created_at: new Date().toISOString(),
      });
    }
  } catch { /* silently ignore — pixel_hits table may not exist yet */ }

  // Retorna pixel 1x1 transparente
  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );

  return new NextResponse(pixel, {
    headers: {
      "Content-Type":  "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
