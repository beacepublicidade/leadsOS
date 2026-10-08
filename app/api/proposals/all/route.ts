export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

// GET /api/proposals/all — lista todas as propostas (admin) ou do cliente (gestor/vendedor)
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const client_id = session.isAdmin
      ? (searchParams.get("client_id") || null)
      : (session.client_id ?? null);

    let query = getAdminDb().collection("proposals").orderBy("created_at", "desc") as FirebaseFirestore.Query;
    if (client_id) query = query.where("client_id", "==", client_id);

    const snap = await query.limit(200).get();

    // Enriquece com nome do lead — batch read (1 roundtrip ao invés de N)
    const rawProposals = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>));

    const leadIds = Array.from(new Set(rawProposals.map((p) => p.lead_id as string).filter(Boolean)));
    const leadMap: Record<string, { name: string; phone: string }> = {};

    if (leadIds.length > 0) {
      const leadRefs = leadIds.map((lid) => getAdminDb().collection("leads").doc(lid));
      const leadDocs = await getAdminDb().getAll(...leadRefs);
      for (const doc of leadDocs) {
        if (doc.exists) {
          leadMap[doc.id] = {
            name:  (doc.data()?.name  as string) ?? "—",
            phone: (doc.data()?.phone as string) ?? "",
          };
        }
      }
    }

    const proposals = rawProposals.map((p) => {
      const lead = leadMap[p.lead_id as string];
      p.lead_name  = lead?.name  ?? "—";
      p.lead_phone = lead?.phone ?? "";
      return p;
    });

    return NextResponse.json({ success: true, data: proposals });
  } catch (err) {
    console.error("[GET /api/proposals/all]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar propostas." }, { status: 500 });
  }
}
