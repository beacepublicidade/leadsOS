export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const STATUS_MAP: Record<string, string> = {
  new:      "novo",
  contact:  "contato",
  proposal: "proposta",
  closed:   "fechado",
  lost:     "perdido",
};

// POST /api/admin/migrate-statuses — migra status legados para português
export async function POST() {
  try {
    const { data: leads, error } = await supabaseAdmin.from("leads").select("id,status");
    if (error) throw error;

    let count = 0;
    const updates: Promise<unknown>[] = [];

    for (const lead of leads ?? []) {
      const status = lead.status as string | undefined;
      if (status && STATUS_MAP[status]) {
        updates.push(
          supabaseAdmin.from("leads").update({ status: STATUS_MAP[status] }).eq("id", lead.id) as unknown as Promise<unknown>
        );
        count++;
      }
    }

    if (updates.length > 0) await Promise.all(updates);

    return NextResponse.json({ success: true, migrated: count });
  } catch (err) {
    console.error("[migrate-statuses]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
