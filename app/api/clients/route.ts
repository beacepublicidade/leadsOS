import { NextRequest, NextResponse } from "next/server";
import { createClient, listClients } from "@/services/clientsService";
import type { CreateClientInput } from "@/types/client";

// GET /api/clients — lista todos os clientes
export async function GET() {
  try {
    const clients = await listClients();
    return NextResponse.json({ success: true, data: clients }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/clients]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar clientes" }, { status: 500 });
  }
}

// POST /api/clients — cria um novo cliente com templates padrão
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CreateClientInput;
    const { name, niche, whatsapp_number } = body;

    if (!name || !niche || !whatsapp_number) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: name, niche, whatsapp_number" },
        { status: 400 }
      );
    }

    const client = await createClient({ name, niche, whatsapp_number });

    return NextResponse.json({ success: true, data: client }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/clients]", err);
    return NextResponse.json({ success: false, error: "Erro ao criar cliente" }, { status: 500 });
  }
}
