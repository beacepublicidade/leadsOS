import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// PATCH /api/leads/[id]/schedule — define ou remove agendamento do lead
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { scheduled_at } = body as { scheduled_at: string | null };

    const ref = getAdminDb().collection("leads").doc(id);
    const doc = await ref.get();

    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: "Lead não encontrado" },
        { status: 404 }
      );
    }

    await ref.update({ scheduled_at: scheduled_at ?? null });

    return NextResponse.json(
      { success: true, data: { id, scheduled_at } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[PATCH /api/leads/[id]/schedule]", err);
    return NextResponse.json(
      { success: false, error: "Erro interno ao salvar agendamento" },
      { status: 500 }
    );
  }
}
