export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export interface CompanySettings {
  company_name:          string;
  cnpj:                  string;
  phone1:                string;
  phone2:                string;
  email:                 string;
  website:               string;
  address_street:        string;
  address_number:        string;
  address_complement:    string;
  address_neighborhood:  string;
  address_city:          string;
  address_state:         string;
  address_zip:           string;
  pix_key:               string;
  pix_holder:            string;
  pix_document:          string;
  primary_color:         string;
  logo_base64:           string;
  updated_at:            string;
}

function resolveClientId(session: { isAdmin: boolean; client_id?: string | null }, qp: URLSearchParams): string | null {
  if (session.isAdmin) return qp.get("client_id") ?? session.client_id ?? null;
  return session.client_id ?? null;
}

// GET /api/settings?client_id=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });

    const clientId = resolveClientId(session, req.nextUrl.searchParams);
    if (!clientId) return NextResponse.json({ success: true, data: {} }); // sem client_id → retorna vazio

    const { data } = await supabaseAdmin.from("company_settings").select("*").eq("id", clientId).single();

    return NextResponse.json({ success: true, data: data ?? {} });
  } catch (err) {
    console.error("[GET /api/settings]", err);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}

// POST /api/settings — salva configurações da empresa
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });

    const body = await req.json() as Partial<CompanySettings> & { client_id?: string };
    const clientId = session.isAdmin ? (body.client_id ?? session.client_id) : session.client_id;
    if (!clientId) return NextResponse.json({ success: false, error: "client_id obrigatório." }, { status: 400 });

    // Remove client_id from the data to store
    const { client_id: _, ...fields } = body;

    // Logo size guard: base64 ~1.37x original; limit original to 400KB → base64 ~550KB
    if (fields.logo_base64 && fields.logo_base64.length > 600_000) {
      return NextResponse.json({ success: false, error: "Logo muito grande. Máximo: 400KB." }, { status: 400 });
    }

    // Upsert: check if exists first
    const { data: existing } = await supabaseAdmin.from("company_settings").select("id").eq("id", clientId).single();

    if (existing) {
      const { error } = await supabaseAdmin.from("company_settings")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", clientId);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("company_settings")
        .insert({ id: clientId, ...fields, updated_at: new Date().toISOString() });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/settings]", err);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}
