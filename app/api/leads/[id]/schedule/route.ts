export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const MATON_CALENDAR_CONN = "1668239e-8d45-49c5-85f1-e47a590d78ec";
const MATON_API_KEY = process.env.MATON_API_KEY ?? "";

/**
 * Cria evento no Google Calendar com Google Meet via Maton.
 * Retorna { eventId, meetLink, htmlLink } ou null se falhar.
 */
async function createCalendarEvent(params: {
  summary:     string;
  description: string;
  startIso:    string; // ISO 8601 com timezone
  endIso:      string;
  attendees:   string[];
}): Promise<{ eventId: string; meetLink: string; htmlLink: string } | null> {
  try {
    const body = {
      summary:     params.summary,
      description: params.description,
      start:  { dateTime: params.startIso, timeZone: "America/Sao_Paulo" },
      end:    { dateTime: params.endIso,   timeZone: "America/Sao_Paulo" },
      attendees: params.attendees.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId:             `leadsOS-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    const res = await fetch(
      "https://api.maton.ai/google-calendar/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
      {
        method:  "POST",
        headers: {
          Authorization:      `Bearer ${MATON_API_KEY}`,
          "Maton-Connection": MATON_CALENDAR_CONN,
          "Content-Type":     "application/json",
          Accept:             "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[Calendar] Maton error:", res.status, err.slice(0, 300));
      return null;
    }

    const event = await res.json() as Record<string, unknown>;
    const meetLink = (
      (event.conferenceData as Record<string, unknown> | undefined)
        ?.entryPoints as Array<Record<string, unknown>> | undefined
    )?.find(e => e.entryPointType === "video")?.uri as string ?? "";

    return {
      eventId:  event.id as string,
      meetLink,
      htmlLink: event.htmlLink as string,
    };
  } catch (err) {
    console.error("[Calendar] createCalendarEvent error:", err);
    return null;
  }
}

// ─── PATCH /api/leads/[id]/schedule ──────────────────────────────────────────
// Body:
//   scheduled_at: string (ISO) | null   — data/hora da reunião
//   duration_min?: number               — duração em minutos (default 30)
//   title?: string                      — título do evento (default: "Reunião BEACE - {nome}")
//   notes?: string                      — descrição/pauta
//   attendee_email?: string             — email do lead para convidar
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body   = await req.json() as {
      scheduled_at?:    string | null;
      duration_min?:    number;
      title?:           string;
      notes?:           string;
      attendee_email?:  string;
    };

    const { scheduled_at, duration_min = 30, title, notes, attendee_email } = body;

    // Fetch lead
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from("leads")
      .select("id, name, email, phone")
      .eq("id", id)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 });
    }

    // Removing schedule
    if (!scheduled_at) {
      await supabaseAdmin.from("leads").update({ scheduled_at: null, meet_link: null, calendar_event_id: null }).eq("id", id);
      return NextResponse.json({ success: true, data: { id, scheduled_at: null } });
    }

    // Create Google Calendar event with Meet
    const startIso   = scheduled_at;
    const endDate    = new Date(new Date(scheduled_at).getTime() + duration_min * 60_000);
    const endIso     = endDate.toISOString();
    const eventTitle = title || `Reunião BEACE — ${lead.name}`;
    const description = notes || `Reunião comercial com ${lead.name}${lead.phone ? ` | ${lead.phone}` : ""}.\n\nAgendado via LeadsOS.`;

    const attendees = ["contato.beace@gmail.com"];
    const leadEmail = attendee_email || lead.email;
    if (leadEmail && leadEmail.includes("@")) attendees.push(leadEmail);

    const calResult = await createCalendarEvent({
      summary:     eventTitle,
      description,
      startIso,
      endIso,
      attendees,
    });

    // Save to lead record
    const update: Record<string, unknown> = {
      scheduled_at,
      updated_at: new Date().toISOString(),
    };
    if (calResult) {
      update.meet_link         = calResult.meetLink;
      update.calendar_event_id = calResult.eventId;
    }

    const { error: updateErr } = await supabaseAdmin.from("leads").update(update).eq("id", id);
    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      data: {
        id,
        scheduled_at,
        meet_link:         calResult?.meetLink  ?? null,
        calendar_event_id: calResult?.eventId   ?? null,
        calendar_link:     calResult?.htmlLink  ?? null,
        calendar_created:  !!calResult,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/leads/[id]/schedule]", err);
    return NextResponse.json({ success: false, error: "Erro interno ao salvar agendamento" }, { status: 500 });
  }
}
