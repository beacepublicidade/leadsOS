export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listTemplates, createTemplate } from "@/services/templatesService";
import type { CreateTemplateInput } from "@/types/template";

const VALID_TYPES = ["followup", "status"];

// GET /api/templates?client_id=<id> — lista templates (opcionalmente filtrado por cliente)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const client_id = searchParams.get("client_id") ?? undefined;
    const templates = await listTemplates(client_id);
    return NextResponse.json({ success: true, data: templates }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/templates]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar templates" }, { status: 500 });
  }
}

// POST /api/templates — cria um novo template
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CreateTemplateInput;
    const { name, type, trigger, message } = body;

    if (!name || !type || !trigger || !message) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: name, type, trigger, message" },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Tipo inválido. Valores aceitos: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const template = await createTemplate({ name, type, trigger, message });
    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/templates]", err);
    return NextResponse.json({ success: false, error: "Erro ao criar template" }, { status: 500 });
  }
}
