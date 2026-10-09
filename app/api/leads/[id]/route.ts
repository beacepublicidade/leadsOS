export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { updateLeadStatus } from "@/services/leadsService";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LEAD_STATUSES } from "@/types/lead";
import type { ApiResponse, LeadStatus } from "@/types/lead";

// GET /api/leads/[id] — busca dados de um lead
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin.from("leads").select("*").eq("id", params.id).single();
    if (error || !data) {
      return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[GET /api/leads/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}

// DELETE /api/leads/[id] — remove o lead
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin.from("leads").delete().eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/leads/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro ao excluir lead." }, { status: 500 });
  }
}

// PATCH /api/leads/[id] — atualiza campos do lead (status, ai_reply, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id }   = params;
    const body     = await req.json() as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    // Status update
    if (body.status !== undefined) {
      const status = body.status as LeadStatus;
      if (!LEAD_STATUSES.includes(status)) {
        return NextResponse.json({ success: false, data: null, error: `Status inválido. Valores aceitos: ${LEAD_STATUSES.join(", ")}` }, { status: 400 });
      }
      await updateLeadStatus(id, status);
      updates.status = status;
    }

    // ai_reply toggle
    if (body.ai_reply !== undefined) {
      updates.ai_reply = Boolean(body.ai_reply);
    }

    // notes (nota rápida do vendedor no kanban)
    if (body.notes !== undefined) {
      updates.notes = String(body.notes).slice(0, 300);
    }

    // tax_id (CPF/CNPJ do lead — usado na cobrança Cora)
    if (body.tax_id !== undefined) {
      updates.tax_id = String(body.tax_id).replace(/\D/g, "").slice(0, 14);
    }

    // assigned_to — responsável pelo lead (nome do vendedor)
    if (body.assigned_to !== undefined) {
      updates.assigned_to = String(body.assigned_to).slice(0, 80);
    }

    // deal_value — valor do deal em R$ (usado no forecast e metas)
    if (body.deal_value !== undefined) {
      const val = Number(body.deal_value);
      updates.deal_value = isNaN(val) ? 0 : Math.max(0, val);
    }

    // phone — allow updating @lid placeholders with the real number
    if (body.phone !== undefined) {
      updates.phone = String(body.phone).trim().slice(0, 30);
    }

    // tags — array de strings para segmentação
    if (body.tags !== undefined) {
      updates.tags = Array.isArray(body.tags)
        ? body.tags.filter((t) => typeof t === "string" && t.trim()).slice(0, 15)
        : [];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum campo para atualizar." }, { status: 400 });
    }

    // Apply non-status updates directly
    const directUpdates = { ...updates };
    delete directUpdates.status;
    if (Object.keys(directUpdates).length > 0) {
      const { error } = await supabaseAdmin.from("leads").update(directUpdates).eq("id", id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, data: { id, ...updates } }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/leads/[id]]", err);
    return NextResponse.json({ success: false, data: null, error: "Erro interno ao atualizar lead" }, { status: 500 });
  }
}
