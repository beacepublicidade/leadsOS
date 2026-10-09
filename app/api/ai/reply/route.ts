export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getConversation } from "@/services/conversationService";
import { supabaseAdmin }   from "@/lib/supabase-admin";

const MATON_CALENDAR_CONN = "1668239e-8d45-49c5-85f1-e47a590d78ec";

// ─── Types ────────────────────────────────────────────────────────────────────
type SchedulingStep = "ask_period" | "ask_slot" | "ask_email" | "confirm" | "done";
interface SchedulingState {
  step:        SchedulingStep;
  period?:     "manha" | "tarde";
  slot?:       string;
  slot_label?: string;
  email?:      string;
}

// ─── Slot generator — avoids Mon / Fri / weekends ────────────────────────────
function generateSlots(period: "manha" | "tarde"): { iso: string; label: string }[] {
  const configs = period === "manha"
    ? [{ h: 9, m: 30 }, { h: 10, m: 0 }]
    : [{ h: 14, m: 30 }, { h: 16, m: 0 }];
  const slots: { iso: string; label: string }[] = [];
  let offset = 1;
  while (slots.length < 2 && offset < 14) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 1 && dow !== 5 && dow !== 6) {
      const cfg = configs[slots.length];
      d.setHours(cfg.h, cfg.m, 0, 0);
      const names = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
      const label = `${names[dow]}, ${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} às ${cfg.h}h${cfg.m > 0 ? cfg.m : ""}`;
      const iso = new Date(d.getTime() + 3 * 3600_000).toISOString().replace("Z", "-03:00");
      slots.push({ iso, label });
    }
    offset++;
  }
  return slots;
}

// ─── Google Calendar + Meet via Maton ────────────────────────────────────────
async function createMeetEvent(params: {
  leadName: string; startIso: string; attendeeEmail: string; leadPhone?: string;
}): Promise<{ meetLink: string; eventId: string } | null> {
  try {
    const start = new Date(params.startIso);
    const end   = new Date(start.getTime() + 30 * 60_000);
    const res = await fetch(
      "https://api.maton.ai/google-calendar/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
      {
        method: "POST",
        headers: {
          Authorization:      `Bearer ${process.env.MATON_API_KEY ?? ""}`,
          "Maton-Connection": MATON_CALENDAR_CONN,
          "Content-Type":     "application/json",
          Accept:             "application/json",
        },
        body: JSON.stringify({
          summary:     `Conversa BEACE — ${params.leadName}`,
          description: `Reunião comercial com ${params.leadName}${params.leadPhone ? ` | ${params.leadPhone}` : ""}.\nAgendado via LeadsOS.`,
          start: { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" },
          end:   { dateTime: end.toISOString(),   timeZone: "America/Sao_Paulo" },
          attendees: [
            { email: "contato.beace@gmail.com" },
            { email: params.attendeeEmail },
          ],
          conferenceData: {
            createRequest: {
              requestId: `rex-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      }
    );
    if (!res.ok) { console.error("[REX Calendar]", res.status, await res.text()); return null; }
    const event = await res.json() as Record<string, unknown>;
    const meetLink = (
      ((event.conferenceData as Record<string,unknown>)?.entryPoints as Array<Record<string,unknown>>)
        ?.find(e => e.entryPointType === "video")?.uri as string
    ) ?? "";
    return { meetLink, eventId: event.id as string };
  } catch (err) {
    console.error("[REX Calendar] error:", err);
    return null;
  }
}

// ─── Detect scheduling intent (reactive — lead asks) ─────────────────────────
function hasSchedulingIntent(text: string): boolean {
  return /\b(quero|queria|pode|vamos|marcar|agendar|reunião|reuniao|call|conversar|quando|horário|horario|disponível|disponivel|videoconfer)\b/i.test(text);
}

// ─── Proactive proposal message (REX proposes the meeting) ───────────────────
function buildSchedulingProposal(firstName: string): string {
  return (
    `Que tal a gente bater um papo rápido de 30 minutos pelo Google Meet, ${firstName}? ` +
    `Posso te mostrar exatamente como a BEACE resolveria isso pra você — sem enrolação. 😊\n\n` +
    `Você prefere:\n☀️ *Manhã* (9h–12h) ou 🌅 *Tarde* (14h–18h)?`
  );
}

// ─── Scheduling state machine ─────────────────────────────────────────────────
async function runSchedulingFlow(
  lead: Record<string, unknown>,
  incomingMsg: string,
  state: SchedulingState | null,
): Promise<{ reply: string; newState: SchedulingState } | null> {

  const firstName = ((lead.name as string) ?? "você").split(" ")[0];
  const lower = incomingMsg.toLowerCase().trim();

  if (!state) {
    if (!hasSchedulingIntent(incomingMsg)) return null;
    // Lead triggered scheduling reactively (typed "quero agendar" etc.)
    return {
      reply: buildSchedulingProposal(firstName),
      newState: { step: "ask_period" },
    };
  }

  if (state.step === "ask_period") {
    const isManha = /manh[aã]|9h|10h|11h/.test(lower);
    const isTarde = /tard[ei]|14h|15h|16h|17h/.test(lower);
    if (!isManha && !isTarde) return { reply: `Me diz se prefere *manhã* ou *tarde*? ☀️🌅`, newState: state };
    const period = isManha ? "manha" : "tarde";
    const slots  = generateSlots(period);
    return {
      reply: `Tenho duas opções:\n\n📅 *Opção 1:* ${slots[0].label}\n📅 *Opção 2:* ${slots[1].label}\n\nQual fica melhor?`,
      newState: { step: "ask_slot", period },
    };
  }

  if (state.step === "ask_slot" && state.period) {
    const slots = generateSlots(state.period);
    const opt1  = /\b1\b|prim|opc|opç/.test(lower);
    const opt2  = /\b2\b|segu|outr/.test(lower);
    if (!opt1 && !opt2) return { reply: `Qual das opções: *1* ou *2*? 😊`, newState: state };
    const chosen = opt1 ? slots[0] : slots[1];
    return {
      reply: `Ótimo! 🗓️ ${chosen.label}.\n\nQual é o seu *email* para enviar o link da reunião? 📧`,
      newState: { step: "ask_email", period: state.period, slot: chosen.iso, slot_label: chosen.label },
    };
  }

  if (state.step === "ask_email" && state.slot && state.slot_label) {
    const emailMatch = incomingMsg.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    if (!emailMatch) return { reply: `Não encontrei um email válido. Pode me enviar? 📧`, newState: state };
    const email = emailMatch[0].toLowerCase();
    return {
      reply: `Confirmando:\n📅 *${state.slot_label}*\n📧 *${email}*\n\nEstá correto? *(Sim / Não)*`,
      newState: { ...state, step: "confirm", email },
    };
  }

  if (state.step === "confirm" && state.slot && state.slot_label && state.email) {
    if (/n[aã]o|no|errado|muda/.test(lower)) {
      return { reply: `Sem problemas! Prefere *manhã* ou *tarde*? ☀️🌅`, newState: { step: "ask_period" } };
    }
    if (!/sim|s\b|certo|ok|correto|isso|exato|perfeito/.test(lower)) {
      return { reply: `Confirma com *Sim* ou me diz se precisa ajustar 😊`, newState: state };
    }
    // Create event
    const calResult = await createMeetEvent({
      leadName:      (lead.name as string) ?? "Lead",
      startIso:      state.slot,
      attendeeEmail: state.email,
      leadPhone:     (lead.phone as string) ?? "",
    });

    // Persist to lead
    await supabaseAdmin.from("leads").update({
      scheduled_at:      state.slot,
      meet_link:         calResult?.meetLink ?? null,
      calendar_event_id: calResult?.eventId  ?? null,
      scheduling_state:  { step: "done" },
      updated_at:        new Date().toISOString(),
    }).eq("id", lead.id as string);

    // Build confirmation — humanized, SDR verifies and reports back
    let confirmMsg: string;
    if (calResult?.meetLink) {
      confirmMsg =
        `Acabei de confirmar aqui — tudo certo no calendário! ✅\n\n` +
        `📅 *${state.slot_label}*\n` +
        `📧 Convite enviado para *${state.email}*\n` +
        `🔗 *Link da reunião:* ${calResult.meetLink}\n\n` +
        `Te espero lá, ${firstName}! Se precisar remarcar é só me chamar. 😊`;
    } else {
      // Calendar failed — still confirm the date, just no Meet link
      confirmMsg =
        `Anotado aqui, ${firstName}! ✅\n\n` +
        `📅 *${state.slot_label}*\n` +
        `📧 *${state.email}*\n\n` +
        `Vou te enviar o link da reunião em instantes. Te espero! 😊`;
    }

    return {
      reply: confirmMsg,
      newState: { step: "done" },
    };
  }

  return null;
}

// ─── POST /api/ai/reply ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { lead_id, auto = false } = await req.json() as { lead_id?: string; auto?: boolean };

    if (!lead_id) return NextResponse.json({ success: false, error: "lead_id obrigatório." }, { status: 400 });

    const dominusUrl = process.env.DOMINUS_URL;
    if (!dominusUrl) return NextResponse.json({ success: false, error: "DOMINUS_URL não configurada." }, { status: 500 });

    const { data: lead, error: leadError } = await supabaseAdmin.from("leads").select("*").eq("id", lead_id).single();
    if (leadError || !lead) return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });

    const leadName  = (lead.name  as string) ?? "cliente";
    const leadPhone = (lead.phone as string) ?? "";
    const source    = (lead.source as string) ?? (lead.campaign_name as string) ?? "não informada";
    const messages  = await getConversation(lead_id);

    // ── Scheduling flow intercept ─────────────────────────────────────────
    const schedState = (lead.scheduling_state as SchedulingState | null) ?? null;
    if (schedState?.step !== "done") {
      const lastIn  = [...messages].reverse().find(m => m.direction === "in");
      const lastMsg = lastIn?.content ?? "";
      const sched   = await runSchedulingFlow(lead, lastMsg, schedState);

      if (sched) {
        // State saved inside runSchedulingFlow for "done" step; save here for all other steps
        if (sched.newState.step !== "done") {
          await supabaseAdmin.from("leads").update({
            scheduling_state: sched.newState,
            updated_at: new Date().toISOString(),
          }).eq("id", lead_id);
        }
        if (auto) {
          const { sendWhatsApp } = await import("@/services/notificationService");
          const { saveMessage }  = await import("@/services/conversationService");
          await sendWhatsApp(leadPhone, sched.reply);
          await saveMessage({ lead_id, phone: leadPhone, direction: "out", content: sched.reply, timestamp: new Date().toISOString(), sender_name: "REX" });
        }
        return NextResponse.json({ success: true, sent: auto, message: sched.reply, scheduling: true });
      }
    }

    // ── SDR especializado por produto (ou REX genérico como fallback) ────
    const history = messages.slice(-10).map(m =>
      `${m.direction === "in" ? leadName : "SDR"}: ${m.content}`
    ).join("\n");

    // Tenta SDR especializado primeiro; cai no REX genérico se não houver produto mapeado
    const sdrEndpoint  = `${dominusUrl}/api/agents/sdr-product`;
    const rexEndpoint  = `${dominusUrl}/api/agents/rex`;
    const agentPayload = JSON.stringify({ leadName, source, history, leadId: lead_id });

    let agentRes = await fetch(sdrEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: agentPayload });
    if (!agentRes.ok) {
      // Fallback to REX
      agentRes = await fetch(rexEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: agentPayload });
      if (!agentRes.ok) throw new Error(`DOMINUS erro (${agentRes.status}): ${(await agentRes.text()).slice(0, 200)}`);
    }

    const { message, shouldHandoff, shouldSchedule, scheduleEmail, scheduleSlot, agent: agentName } = await agentRes.json() as {
      message: string; shouldHandoff: boolean; agent?: string;
      shouldSchedule?: boolean; scheduleEmail?: string | null; scheduleSlot?: string | null;
    };

    if (!message) return NextResponse.json({ success: false, error: "REX não retornou resposta." }, { status: 500 });

    // REX emitiu ||SCHEDULE|| com email+slot — cria o evento direto sem state machine
    if (shouldSchedule && scheduleEmail && scheduleSlot) {
      const calResult = await createMeetEvent({
        leadName,
        startIso:      scheduleSlot,
        attendeeEmail: scheduleEmail,
        leadPhone,
      });
      await supabaseAdmin.from("leads").update({
        scheduled_at:      scheduleSlot,
        meet_link:         calResult?.meetLink ?? null,
        calendar_event_id: calResult?.eventId  ?? null,
        scheduling_state:  { step: "done" },
        updated_at:        new Date().toISOString(),
      }).eq("id", lead_id);
      // message já contém a confirmação humanizada que o REX escreveu
      if (auto) {
        const { sendWhatsApp } = await import("@/services/notificationService");
        const { saveMessage }  = await import("@/services/conversationService");
        await sendWhatsApp(leadPhone, message);
        await saveMessage({ lead_id, phone: leadPhone, direction: "out", content: message, timestamp: new Date().toISOString(), sender_name: agentName ?? "SDR" });
        return NextResponse.json({ success: true, sent: true, message, scheduled: true, meet_link: calResult?.meetLink });
      }
      return NextResponse.json({ success: true, sent: false, message, scheduled: true, meet_link: calResult?.meetLink });
    }

    if (shouldHandoff) {
      const { notifySupervisor } = await import("@/services/supervisorService");
      const humanUntil = new Date(Date.now() + 24 * 3600_000).toISOString();
      await Promise.all([
        supabaseAdmin.from("leads").update({ mode: "human", human_until: humanUntil }).eq("id", lead_id),
        notifySupervisor(`🎯 Lead pronto pro closer!\nNome: ${leadName}\nFone: ${leadPhone}\nREX qualificou — só fechar o valor.`, lead_id),
      ]);
    }

    if (auto) {
      const { sendWhatsAppVoice } = await import("@/services/notificationService");
      const { saveMessage }       = await import("@/services/conversationService");
      const { shouldSendAsAudio } = await import("@/services/ttsService");
      const msgCount = (history as unknown[])?.length ?? 0;
      const currentAgent = agentName ?? "REX";
      if (shouldSendAsAudio(message, msgCount)) {
        await sendWhatsAppVoice(leadPhone, message, currentAgent, lead_id);
      } else {
        const { sendWhatsApp } = await import("@/services/notificationService");
        await sendWhatsApp(leadPhone, message);
      }
      await saveMessage({ lead_id, phone: leadPhone, direction: "out", content: message, timestamp: new Date().toISOString(), sender_name: currentAgent });
      return NextResponse.json({ success: true, sent: true, message, handoff: shouldHandoff });
    }

    return NextResponse.json({ success: true, sent: false, message, handoff: shouldHandoff });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/ai/reply]", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
