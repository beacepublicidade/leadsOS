export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

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
    const db = getAdminDb();
    const snap = await db.collection("email_sends").doc(params.id).get();
    if (snap.exists) {
      const data = snap.data()!;
      await snap.ref.update({
        opened:     true,
        opened_at:  new Date().toISOString(),
        open_count: (data.open_count ?? 0) + 1,
      });
      // Notifica o lead com flag de abertura
      if (data.lead_id) {
        await db.collection("leads").doc(data.lead_id).update({
          last_email_opened_at: new Date().toISOString(),
        });
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
