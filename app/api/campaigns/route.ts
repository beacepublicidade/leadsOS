export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb }         from "@/lib/firebase-admin";
import { getSessionUser }     from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const session   = await getSessionUser(req);
    const client_id = session?.isAdmin ? null : (session?.client_id ?? null);

    const db   = getAdminDb();
    let query: FirebaseFirestore.Query = db.collection("campaigns");

    if (client_id) {
      query = query.where("client_id", "==", client_id);
    }

    const snap = await query.limit(50).get();

    const campaigns = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const dateA = new Date((a.created_at as string) ?? 0).getTime();
        const dateB = new Date((b.created_at as string) ?? 0).getTime();
        return dateB - dateA;
      });

    return NextResponse.json({ success: true, campaigns });
  } catch (err) {
    console.error("[GET /api/campaigns]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar campanhas." }, { status: 500 });
  }
}
