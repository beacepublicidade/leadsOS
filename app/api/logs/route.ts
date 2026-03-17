export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// GET /api/logs?lead_id=<id>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lead_id = searchParams.get("lead_id");

    let query = getAdminDb()
      .collection("logs")
      .orderBy("created_at", "desc")
      .limit(100);

    if (lead_id) {
      query = getAdminDb()
        .collection("logs")
        .where("lead_id", "==", lead_id)
        .orderBy("created_at", "desc")
        .limit(100);
    }

    const snap = await query.get();
    const logs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ success: true, logs }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/logs]", err);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar logs" },
      { status: 500 }
    );
  }
}
