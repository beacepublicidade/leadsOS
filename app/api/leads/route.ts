export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser }   from "@/lib/getSessionUser";
import { calculateScore }   from "@/services/scoringService";

// POST /api/leads — cria um novo lead
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const body    = await req.json() as Record<string, unknown>;

    const name     = (body.name     as string | undefined)?.trim();
    const phone    = (body.phone    as string | undefined)?.trim();
    const email    = (body.email    as string | undefined)?.trim() ?? "";
    const source   = (body.source   as string | undefined) ?? "manual";
    const campaign = (body.campaign as string | undefined)?.trim() || "manual";

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: "Nome e telefone são obrigatórios." }, { status: 400 });
    }

    // client_id: body tem prioridade (frontend já envia o correto),
    // fallback para sessão, fallback para null
    const client_id = (body.client_id as string | undefined)
      ?? session?.client_id
      ?? null;

    const score = calculateScore({ name, phone, email, source, campaign_name: campaign });

    const { data, error } = await supabaseAdmin.from("leads").insert({
      name,
      phone,
      email,
      source,
      campaign_name: campaign,
      status:        "novo",
      score,
      client_id:     client_id ?? null,
      created_at:    new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    // Notificar DOMINUS para acionar SDR automaticamente (fire-and-forget)
    const dominusUrl = process.env.DOMINUS_URL ?? 'https://dominus-docs.vercel.app'
    fetch(`${dominusUrl}/api/webhook/new-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
      },
      body: JSON.stringify({ lead_id: data.id, name, phone, source, campaign }),
    }).catch(err => console.error('[LeadsOS] DOMINUS webhook error:', err))

    return NextResponse.json({ success: true, data: { id: data.id, name, phone } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/leads]", err);
    return NextResponse.json({ success: false, error: "Erro interno ao criar lead" }, { status: 500 });
  }
}

// GET /api/leads — lista os 100 leads mais recentes, com filtro opcional por data e cliente
export async function GET(req: NextRequest) {
  try {
    const session   = await getSessionUser(req);
    const { searchParams } = req.nextUrl;
    const start     = searchParams.get("start");
    const end       = searchParams.get("end");

    // Admins podem filtrar por qualquer cliente; não-admins só veem o próprio
    const client_id = session?.isAdmin
      ? (searchParams.get("client_id") || null)
      : (session?.client_id ?? null);

    let query = supabaseAdmin.from("leads").select("*");

    if (client_id) {
      query = query.eq("client_id", client_id);
    }

    if (start) {
      query = query.gte("created_at", `${start}T00:00:00.000Z`);
    }

    if (end) {
      query = query.lte("created_at", `${end}T23:59:59.999Z`);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
    if (error) throw error;

    return NextResponse.json({ leads: data ?? [] }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/leads]", err);
    return NextResponse.json(
      { leads: [], error: "Erro interno ao buscar leads" },
      { status: 500 }
    );
  }
}
