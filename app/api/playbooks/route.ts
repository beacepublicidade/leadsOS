import { NextRequest, NextResponse } from "next/server";
import { createPlaybook, listPlaybooks } from "@/services/playbooksService";
import type { CreatePlaybookInput, PlaybookTemplate } from "@/types/playbook";

const VALID_TYPES = ["status", "followup"];

// GET /api/playbooks — lista todos os playbooks
export async function GET() {
  try {
    const playbooks = await listPlaybooks();
    return NextResponse.json({ success: true, data: playbooks }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/playbooks]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar playbooks" }, { status: 500 });
  }
}

// POST /api/playbooks — cria um playbook de nicho
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CreatePlaybookInput;
    const { niche, templates } = body;

    if (!niche || !Array.isArray(templates) || templates.length === 0) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: niche, templates (array não vazio)" },
        { status: 400 }
      );
    }

    // Validate each template entry
    for (const t of templates as PlaybookTemplate[]) {
      if (!t.type || !t.trigger || !t.message) {
        return NextResponse.json(
          { success: false, error: "Cada template precisa de: type, trigger, message" },
          { status: 400 }
        );
      }
      if (!VALID_TYPES.includes(t.type)) {
        return NextResponse.json(
          { success: false, error: `Tipo inválido "${t.type}". Aceitos: ${VALID_TYPES.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const playbook = await createPlaybook({
      niche: niche.toLowerCase().trim(),
      templates,
    });

    return NextResponse.json({ success: true, data: playbook }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/playbooks]", err);
    return NextResponse.json({ success: false, error: "Erro ao criar playbook" }, { status: 500 });
  }
}
