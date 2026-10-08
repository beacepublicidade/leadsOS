export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyNaiaKey } from "@/lib/naiaAuth";

export async function GET(req: NextRequest) {
  try {
    const session = await verifyNaiaKey(req);
    if (!session) return NextResponse.json({ success: false, error: "API key inválida ou rate limit excedido" }, { status: 401 });

    const db = getAdminDb();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") ?? "50");
    const offset = parseInt(url.searchParams.get("offset") ?? "0");

    // FIX: Firestore não suporta orderBy + where em campos diferentes sem índice composto.
    // Quando há filtro de status ou tenant, removemos orderBy e fazemos sort no JS.
    const hasFilters = !!status || session.tenant_id !== "default";

    let query: FirebaseFirestore.Query = db.collection("leads");

    if (!hasFilters) {
      query = query.orderBy("created_at", "desc");
    }

    if (session.tenant_id !== "default") {
      query = query.where("client_id", "==", session.tenant_id);
    }
    if (status) {
      query = query.where("status", "==", status);
    }

    const snap = await query.limit(limit + offset).get();
    let docs = snap.docs;

    // Sort no JS quando não fizemos orderBy no Firestore
    if (hasFilters) {
      docs = docs.sort((a, b) => {
        const ca = a.data().created_at ?? "";
        const cb = b.data().created_at ?? "";
        return cb.localeCompare(ca);
      });
    }

    const leads = docs.slice(offset).map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: data.status,
        score: data.score,
        source: data.source,
        campaign_name: data.campaign_name,
        created_at: data.created_at,
      };
    });

    return NextResponse.json({ success: true, data: leads, total: snap.size });
  } catch (err) {
    console.error("[NAIA GET /api/naia/leads]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyNaiaKey(req);
    if (!session) return NextResponse.json({ success: false, error: "API key inválida" }, { status: 401 });

    if (!session.permissions.includes("leads:write")) {
      return NextResponse.json({ success: false, error: "Permissão negada" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, source, status, campaign_name, notes } = body as {
      name: string; email?: string; phone?: string; source?: string;
      status?: string; campaign_name?: string; notes?: string;
    };

    if (!name) {
      return NextResponse.json({ success: false, error: "Nome obrigatório" }, { status: 400 });
    }

    const db = getAdminDb();
    const leadData = {
      name,
      email: email ?? "",
      phone: phone ?? "",
      source: source ?? "naia",
      status: status ?? "novo",
      score: 0,
      campaign_name: campaign_name ?? "",
      notes: notes ?? "",
      client_id: session.tenant_id !== "default" ? session.tenant_id : "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const docRef = await db.collection("leads").add(leadData);
    return NextResponse.json({ success: true, data: { id: docRef.id, ...leadData } }, { status: 201 });
  } catch (err) {
    console.error("[NAIA POST /api/naia/leads]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
