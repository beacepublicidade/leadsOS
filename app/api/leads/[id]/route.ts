export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { updateLeadStatus } from "@/services/leadsService";
import { getAdminDb } from "@/lib/firebase-admin";
import { LEAD_STATUSES } from "@/types/lead";
import type { ApiResponse, LeadStatus } from "@/types/lead";

// GET /api/leads/[id] — busca dados de um lead
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await getAdminDb().collection("leads").doc(params.id).get();
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error("[GET /api/leads/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}

// PATCH /api/leads/[id] — atualiza o status do lead
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status } = body as { status: LeadStatus };

    if (!status || !LEAD_STATUSES.includes(status)) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: `Status inválido. Valores aceitos: ${LEAD_STATUSES.join(", ")}`,
      };
      return NextResponse.json(response, { status: 400 });
    }

    await updateLeadStatus(id, status);

    const response: ApiResponse<{ id: string; status: LeadStatus }> = {
      success: true,
      data: { id, status },
    };
    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/leads/[id]]", err);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Erro interno ao atualizar status",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
