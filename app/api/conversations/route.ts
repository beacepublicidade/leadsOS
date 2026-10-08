export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

// GET /api/conversations — lista conversas usando campos denormalizados no lead
// Custo: N leituras (N = número de leads com mensagens) em vez de 300 leituras por chamada
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const db      = getAdminDb();

    // Uma única query na coleção leads — só lê leads que já têm mensagens
    let query = db
      .collection("leads")
      .where("last_message_timestamp", "!=", null)
      .orderBy("last_message_timestamp", "desc")
      .limit(100);

    const snap = await query.get();

    const conversations = snap.docs
      .map((doc) => {
        const lead = doc.data();

        // RBAC: não-admin só vê leads do próprio cliente
        if (!session?.isAdmin && session?.client_id) {
          if (lead.client_id !== session.client_id) return null;
        }

        const mode       = lead.mode        as string | undefined ?? "auto";
        const humanUntil = lead.human_until as string | undefined;
        const isHuman    = mode === "human" && humanUntil && new Date(humanUntil) > new Date();

        return {
          lead_id:      doc.id,
          name:         lead.name                  as string,
          phone:        lead.phone                 as string,
          last_message: lead.last_message_content  as string ?? "",
          direction:    lead.last_message_direction as string ?? "in",
          sender_name:  lead.last_message_sender   as string | undefined,
          timestamp:    lead.last_message_timestamp as string,
          mode:         isHuman ? "human" : "auto",
        };
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, data: conversations });
  } catch (err) {
    console.error("[GET /api/conversations]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar conversas." }, { status: 500 });
  }
}
