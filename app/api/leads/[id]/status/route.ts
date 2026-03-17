import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { runStatusAutomation } from "@/services/automationService";
import { logAction } from "@/services/logsService";

const VALID_STATUSES = ["novo", "contato", "proposta", "fechado", "perdido"] as const;
type LeadStatus = typeof VALID_STATUSES[number];

// PATCH /api/leads/[id]/status — atualiza o status do lead no pipeline CRM
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status } = body as { status: LeadStatus };

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Status inválido. Valores aceitos: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const ref = adminDb.collection("leads").doc(id);
    const doc = await ref.get();

    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: "Lead não encontrado" },
        { status: 404 }
      );
    }

    const data = doc.data() as { name?: string; phone?: string; status?: string; first_response_at?: string };

    const update: Record<string, string> = { status };

    // Set first_response_at once when leaving "novo" for the first time
    if (data.status === "novo" && status !== "novo" && !data.first_response_at) {
      update.first_response_at = new Date().toISOString();
    }

    await ref.update(update);

    logAction({
      lead_id:    id,
      type:       "status_change",
      message:    `Status alterado de "${data.status ?? "?"}" para "${status}".`,
      created_at: "",
    }).catch(() => {});

    // Dispara automação assíncrona sem bloquear a resposta
    if (data.name && data.phone) {
      runStatusAutomation(status, { name: data.name, phone: data.phone }).catch(
        (err) => console.error("[LeadsOS] Automation error:", err)
      );
    }

    return NextResponse.json(
      { success: true, data: { id, status } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[PATCH /api/leads/[id]/status]", err);
    return NextResponse.json(
      { success: false, error: "Erro interno ao atualizar status" },
      { status: 500 }
    );
  }
}
