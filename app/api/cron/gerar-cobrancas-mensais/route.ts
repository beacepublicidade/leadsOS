export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getNextChargeDate } from "@/services/financialService";

export async function GET(req: NextRequest) {
  try {
    // Verificar CRON_SECRET
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret") ?? req.headers.get("x-cron-secret");
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const db = getAdminDb();
    const today = new Date().toISOString().slice(0, 10);

    // Buscar recorrências ativas com next_charge_date <= hoje
    const snap = await db.collection("financial_recurrences")
      .where("status", "==", "ativa")
      .where("next_charge_date", "<=", today)
      .get();

    let generated = 0;
    const errors: string[] = [];

    for (const doc of snap.docs) {
      const rec = doc.data();
      try {
        // Criar cobrança
        let coraId = "";
        let pixCode = "";
        let boletoUrl = "";

        try {
          const { createPixCharge } = await import("@/services/coraService");
          const charge = await createPixCharge({
            amount: rec.amount,
            description: rec.description,
            payerName: rec.client_name ?? "Cliente",
            payerTaxId: "00000000000",
          });
          coraId = charge.chargeId;
          pixCode = charge.pixCode ?? "";
          boletoUrl = charge.boletoUrl ?? "";
        } catch {
          console.warn("[Cron] Cora falhou para recorrência", doc.id);
        }

        await db.collection("financial_charges").add({
          client_id: rec.client_id,
          client_name: rec.client_name ?? "",
          description: rec.description,
          amount: rec.amount,
          status: "pendente",
          payment_type: rec.payment_type ?? "pix",
          cora_id: coraId,
          pix_code: pixCode,
          boleto_url: boletoUrl,
          due_date: rec.next_charge_date,
          paid_at: "",
          nfse_id: "",
          recurrence_id: doc.id,
          tenant_id: rec.tenant_id,
          created_at: new Date().toISOString(),
        });

        // Atualizar next_charge_date
        const nextDate = getNextChargeDate(rec.day_of_month, rec.next_charge_date);
        await doc.ref.update({
          next_charge_date: nextDate,
          updated_at: new Date().toISOString(),
        });

        // Enviar WhatsApp (se configurado)
        try {
          const { sendWhatsApp } = await import("@/services/notificationService");
          if (rec.client_phone) {
            await sendWhatsApp(
              rec.client_phone,
              `Olá! Sua cobrança de ${rec.description} no valor de R$ ${rec.amount.toLocaleString("pt-BR")} foi gerada. Vencimento: ${new Date(rec.next_charge_date + "T12:00:00").toLocaleDateString("pt-BR")}.`
            );
          }
        } catch {
          // WhatsApp é opcional
        }

        generated++;
      } catch (err) {
        errors.push(`Recorrência ${doc.id}: ${err instanceof Error ? err.message : "erro"}`);
      }
    }

    console.log(`[Cron gerar-cobrancas-mensais] ${generated} cobranças geradas, ${errors.length} erros`);

    return NextResponse.json({
      success: true,
      generated,
      errors,
      total_recurrences: snap.size,
    });
  } catch (err) {
    console.error("[Cron gerar-cobrancas-mensais]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
