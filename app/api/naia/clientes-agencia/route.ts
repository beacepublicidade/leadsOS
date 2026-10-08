export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyNaiaKey } from "@/lib/naiaAuth";

export async function GET(req: NextRequest) {
  try {
    const session = await verifyNaiaKey(req);
    if (!session) return NextResponse.json({ success: false, error: "API key inválida" }, { status: 401 });

    if (!session.permissions.includes("clients:read")) {
      return NextResponse.json({ success: false, error: "Permissão negada" }, { status: 403 });
    }

    const db = getAdminDb();
    // FIX: Firestore não suporta orderBy + where sem índice composto.
    // Removemos orderBy e fazemos sort no JS após buscar os resultados.
    let query: FirebaseFirestore.Query = db.collection("agency_clients")
      .where("status", "==", "ativo");

    if (session.tenant_id !== "default") {
      query = query.where("tenant_id", "==", session.tenant_id);
    }

    const snap = await query.get();
    const clients = snap.docs
      .sort((a, b) => {
        const ca = a.data().created_at ?? "";
        const cb = b.data().created_at ?? "";
        return cb.localeCompare(ca);
      })
      .map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          niche: data.niche,
          responsible: data.responsible,
          monthly_value: data.monthly_value,
          status: data.status,
        };
      });

    return NextResponse.json({ success: true, data: clients });
  } catch (err) {
    console.error("[NAIA GET /api/naia/clientes-agencia]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
