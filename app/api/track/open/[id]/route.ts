export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Pixel transparente 1x1 GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin.from("email_sends").select("*").eq("id", params.id).single();
    if (!error && data) {
      await supabaseAdmin.from("email_sends").update({
        opened:     true,
        opened_at:  new Date().toISOString(),
        open_count: ((data.open_count as number) ?? 0) + 1,
      }).eq("id", params.id);

      // Notifica o lead com flag de abertura
      if (data.lead_id) {
        await supabaseAdmin.from("leads").update({
          last_email_opened_at: new Date().toISOString(),
        }).eq("id", data.lead_id);
      }
    }
  } catch { /* silently ignore — não quebrar o email */ }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type":  "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma":        "no-cache",
    },
  });
}
