export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const STATUS_MAP: Record<string, string> = {
  new:      "novo",
  contact:  "contato",
  proposal: "proposta",
  closed:   "fechado",
  lost:     "perdido",
};

// POST /api/admin/migrate-statuses — migra status legados para português
export async function POST() {
  try {
    const db   = getAdminDb();
    const snap = await db.collection("leads").get();

    const batch  = db.batch();
    let   count  = 0;

    for (const doc of snap.docs) {
      const status = doc.data().status as string | undefined;
      if (status && STATUS_MAP[status]) {
        batch.update(doc.ref, { status: STATUS_MAP[status] });
        count++;
      }
    }

    if (count > 0) await batch.commit();

    return NextResponse.json({ success: true, migrated: count });
  } catch (err) {
    console.error("[migrate-statuses]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
