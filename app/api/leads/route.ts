export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createLead } from "@/services/leadsService";
import { getAdminDb } from "@/lib/firebase-admin";
import type { ApiResponse, Lead, CreateLeadInput } from "@/types/lead";

// POST /api/leads — cria um novo lead
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { name, phone, email, source, campaign } = body as CreateLeadInput;

    if (!name || !phone || !email || !source || !campaign) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: "Campos obrigatórios: name, phone, email, source, campaign",
      };
      return NextResponse.json(response, { status: 400 });
    }

    const lead = await createLead({ name, phone, email, source, campaign });

    const response: ApiResponse<Lead> = { success: true, data: lead };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("[POST /api/leads]", err);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Erro interno ao criar lead",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// GET /api/leads — lista os 50 leads mais recentes, com filtro opcional por data e cliente
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const start     = searchParams.get("start");     // YYYY-MM-DD
    const end       = searchParams.get("end");       // YYYY-MM-DD
    const client_id = searchParams.get("client_id"); // optional

    let query = getAdminDb()
      .collection("leads")
      .orderBy("created_at", "desc") as FirebaseFirestore.Query;

    if (client_id) {
      query = query.where("client_id", "==", client_id);
    }

    if (start) {
      query = query.where("created_at", ">=", `${start}T00:00:00.000Z`);
    }

    if (end) {
      query = query.where("created_at", "<=", `${end}T23:59:59.999Z`);
    }

    const snapshot = await query.limit(50).get();
    const leads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ leads }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/leads]", err);
    return NextResponse.json(
      { leads: [], error: "Erro interno ao buscar leads" },
      { status: 500 }
    );
  }
}
