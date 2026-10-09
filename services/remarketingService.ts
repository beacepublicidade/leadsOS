import { supabaseAdmin } from "@/lib/supabase-admin";
import { logAction }   from "@/services/logsService";

interface EmailLead {
  id:    string;
  name:  string;
  email: string;
  phone: string;
}

/**
 * Envia email de remarketing via Resend.
 * Requer: RESEND_API_KEY, RESEND_FROM (ex: "LeadsOS <noreply@seudominio.com>")
 */
async function sendRemarketingEmail(
  lead: EmailLead,
  subject: string,
  html: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM ?? "LeadsOS <noreply@leados.app>";

  if (!apiKey) {
    console.warn("[Remarketing] RESEND_API_KEY não configurada — email não enviado.");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to:      [lead.email],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend erro (${res.status}): ${err.slice(0, 200)}`);
  }
  return true;
}

function buildRemarketingHtml(firstName: string, clientName: string, ctaUrl?: string): string {
  const cta = ctaUrl
    ? `<p style="text-align:center;margin:32px 0">
         <a href="${ctaUrl}" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
           Quero saber mais
         </a>
       </p>`
    : "";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#7c3aed;padding:28px 32px">
      <h1 style="color:#fff;margin:0;font-size:22px">${clientName}</h1>
    </div>
    <div style="padding:32px">
      <p style="font-size:16px;color:#222;margin-top:0">Olá, <strong>${firstName}</strong>!</p>
      <p style="font-size:15px;color:#444;line-height:1.6">
        Notamos que você demonstrou interesse em nossos serviços mas ainda não tivemos a chance de conversar.
        Gostaríamos muito de entender o que você precisa e como podemos ajudar.
      </p>
      <p style="font-size:15px;color:#444;line-height:1.6">
        Temos soluções pensadas especialmente para o seu perfil — e adoraríamos apresentar!
      </p>
      ${cta}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="font-size:13px;color:#888;margin:0">
        Respondeu a esta mensagem se preferir e nossa equipe retorna em breve.<br>
        Para não receber mais nossos emails, responda com <em>CANCELAR</em>.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Processa remarketing de email para leads com email cadastrado
 * que estão estagnados há > 3 dias (sem resposta) — chamado pelo cron de triggers.
 */
export async function processEmailRemarketing(): Promise<number> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return 0; // não configurado

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // Leads com email, não convertidos, criados há > 3 dias sem remarketing enviado
  const { data: leadsData, error } = await supabaseAdmin
    .from("leads")
    .select("*")
    .in("status", ["novo", "contato"])
    .lte("created_at", threeDaysAgo)
    .limit(30);

  if (error) {
    console.error("[Remarketing] Erro ao buscar leads:", error);
    return 0;
  }

  let sent = 0;

  for (const lead of leadsData ?? []) {
    const email = lead.email as string | undefined;

    if (!email || !email.includes("@")) continue;

    // Enviou remarketing nas últimas 7 dias?
    const lastEmail = lead.remarketing_email_at as string | undefined;
    if (lastEmail && Date.now() - new Date(lastEmail).getTime() < 7 * 24 * 60 * 60 * 1000) continue;

    // Busca nome do cliente para personalizar
    const clientId   = lead.client_id as string | undefined;
    let   clientName = "Nossa Empresa";
    if (clientId) {
      const { data: clientDoc } = await supabaseAdmin.from("clients").select("name").eq("id", clientId).single();
      if (clientDoc?.name) clientName = clientDoc.name as string;
    }

    const firstName = (lead.name as string).split(" ")[0];
    const subject   = `${firstName}, ainda posso te ajudar? 👋`;
    const html      = buildRemarketingHtml(firstName, clientName, lead.lp_url as string | undefined);

    try {
      await sendRemarketingEmail(
        { id: lead.id, name: lead.name as string, email, phone: lead.phone as string },
        subject,
        html
      );
      await supabaseAdmin.from("leads").update({ remarketing_email_at: new Date().toISOString() }).eq("id", lead.id);
      await logAction({
        lead_id:    lead.id,
        type:       "automation",
        message:    `Email de remarketing enviado para ${email}.`,
        created_at: new Date().toISOString(),
      });
      sent++;
    } catch (err) {
      console.error(`[Remarketing] Erro ao enviar email para ${email}:`, err);
    }
  }

  return sent;
}
