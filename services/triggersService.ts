import { getAdminDb }           from "@/lib/firebase-admin";
import { notifyStagnatedLead }  from "@/services/supervisorService";
import { logAction }            from "@/services/logsService";
import { sendWhatsAppForLead }  from "@/services/notificationService";
import { saveMessage }          from "@/services/conversationService";

const HOURS = (h: number) => h * 60 * 60 * 1000;

interface TriggerResult {
  stagnated:  number;
  propRemind: number;
  geladeira:  number;
}

/**
 * Processa gatilhos comportamentais:
 * 1. Leads "novo" há > 2h sem contato → lembra o vendedor + envia mensagem automática
 * 2. Leads "contato" há > 48h sem avanço → notifica supervisor
 * 3. Propostas "awaiting_signature" há > 2 dias → envia lembrete ao lead
 */
export async function processTriggers(): Promise<TriggerResult> {
  const db  = getAdminDb();
  const now = Date.now();
  const result: TriggerResult = { stagnated: 0, propRemind: 0, geladeira: 0 };

  // ── 1. Leads novos estagnados há > 2h ──────────────────────────────────────
  const twoHoursAgo = new Date(now - HOURS(2)).toISOString();
  const novosSnap   = await db.collection("leads")
    .where("status", "==", "novo")
    .where("created_at", "<=", twoHoursAgo)
    .limit(20)
    .get();

  for (const doc of novosSnap.docs) {
    const lead = doc.data();
    const lastTriggered = lead.trigger_novo_notified_at as string | undefined;
    // Dispara no máximo uma vez a cada 12h por lead
    if (lastTriggered && now - new Date(lastTriggered).getTime() < HOURS(12)) continue;

    await notifyStagnatedLead({
      id:     doc.id,
      name:   lead.name   as string,
      phone:  lead.phone  as string,
      status: "novo",
      hours:  Math.round((now - new Date(lead.created_at as string).getTime()) / HOURS(1)),
    });
    await doc.ref.update({ trigger_novo_notified_at: new Date().toISOString() });
    result.stagnated++;
  }

  // ── 2. Leads "contato" estagnados há > 48h ─────────────────────────────────
  const twoDaysAgo   = new Date(now - HOURS(48)).toISOString();
  const contatoSnap  = await db.collection("leads")
    .where("status", "==", "contato")
    .where("status_updated_at", "<=", twoDaysAgo)
    .limit(20)
    .get();

  for (const doc of contatoSnap.docs) {
    const lead = doc.data();
    const lastTriggered = lead.trigger_contato_notified_at as string | undefined;
    if (lastTriggered && now - new Date(lastTriggered).getTime() < HOURS(24)) continue;

    await notifyStagnatedLead({
      id:     doc.id,
      name:   lead.name   as string,
      phone:  lead.phone  as string,
      status: "contato",
      hours:  48,
    });
    await doc.ref.update({ trigger_contato_notified_at: new Date().toISOString() });
    result.stagnated++;
  }

  // ── 3. Propostas aguardando assinatura há > 2 dias ─────────────────────────
  const propSnap = await db.collection("proposals")
    .where("status", "==", "awaiting_signature")
    .where("created_at", "<=", twoDaysAgo)
    .limit(20)
    .get();

  for (const doc of propSnap.docs) {
    const prop = doc.data();
    const lastReminder = prop.reminder_sent_at as string | undefined;
    if (lastReminder && now - new Date(lastReminder).getTime() < HOURS(48)) continue;

    const phone = prop.lead_phone as string | undefined;
    const name  = prop.lead_name  as string | undefined;
    const leadId = prop.lead_id   as string | undefined;

    if (!phone || !name) continue;

    const firstName = name.split(" ")[0];
    const message   =
      `Oi ${firstName}! Sua proposta ainda está disponível para assinatura. ` +
      `Conseguiu dar uma olhada? 😊`;

    try {
      const zapiId = await sendWhatsAppForLead(phone, message, leadId ?? "");
      await saveMessage({
        lead_id:     leadId ?? "",
        phone,
        direction:   "out",
        content:     message,
        timestamp:   new Date().toISOString(),
        sender_name: "Lembrete Proposta",
        status:      "sent",
        ...(zapiId && { zapi_id: zapiId }),
      });
      await logAction({
        lead_id:    leadId ?? "",
        type:       "automation",
        message:    `Lembrete de proposta enviado para ${phone}.`,
        created_at: new Date().toISOString(),
      });
      await doc.ref.update({ reminder_sent_at: new Date().toISOString() });
      result.propRemind++;
    } catch (err) {
      console.error("[Triggers] Erro ao enviar lembrete proposta:", err);
    }
  }

  // ── 4. Geladeira — reativação de leads frios 30/60/90 dias ────────────────
  const DAYS = (d: number) => d * 24 * 60 * 60 * 1000;

  const geladeiraCuts = [
    { days: 90, step: 3, field: "geladeira_90_at", message: (n: string) =>
      `Oi ${n}! Faz um tempinho que não nos falamos. 😊 Ainda pensando em investir no seu negócio? Posso montar uma proposta personalizada pra você hoje. É só me falar!` },
    { days: 60, step: 2, field: "geladeira_60_at", message: (n: string) =>
      `Olá ${n}! Passando para saber se surgiu alguma dúvida desde a última vez que conversamos. Tenho algumas novidades que podem te interessar. Podemos bater um papo rápido? 🚀` },
    { days: 30, step: 1, field: "geladeira_30_at", message: (n: string) =>
      `Oi ${n}! Tudo bem? Percebi que faz um mês desde nosso último contato. Queria saber se você ainda tem interesse — posso te apresentar algo novo que acabou de sair. 😉` },
  ];

  for (const cut of geladeiraCuts) {
    const cutDate = new Date(now - DAYS(cut.days)).toISOString();
    const snap = await db.collection("leads")
      .where("status", "in", ["perdido", "contato", "novo"])
      .where("created_at", "<=", cutDate)
      .limit(30)
      .get();

    for (const doc of snap.docs) {
      const lead = doc.data();
      const lastSent = lead[cut.field] as string | undefined;
      // Dispara só uma vez por step
      if (lastSent) continue;
      // Não reativar se já foi reativado num step mais recente
      if (cut.step < 3 && lead["geladeira_90_at"]) continue;
      if (cut.step < 2 && lead["geladeira_60_at"]) continue;

      const phone = lead.phone as string | undefined;
      const name  = (lead.name  as string | undefined) ?? "cliente";
      const leadId = doc.id;

      if (!phone) continue;

      const firstName = name.split(" ")[0];
      const message   = cut.message(firstName);

      try {
        const msgId = await sendWhatsAppForLead(phone, message, leadId);
        await saveMessage({
          lead_id:     leadId,
          phone,
          direction:   "out",
          content:     message,
          timestamp:   new Date().toISOString(),
          sender_name: `Geladeira ${cut.days}d`,
          status:      "sent",
          ...(msgId && { wa_msg_id: msgId }),
        });
        await logAction({
          lead_id:    leadId,
          type:       "automation",
          message:    `Geladeira step ${cut.step} (${cut.days} dias) enviada para ${phone}.`,
          created_at: new Date().toISOString(),
        });
        await doc.ref.update({ [cut.field]: new Date().toISOString() });
        result.geladeira++;
      } catch (err) {
        console.error(`[Triggers] Erro geladeira ${cut.days}d:`, err);
      }
    }
  }

  return result;
}
