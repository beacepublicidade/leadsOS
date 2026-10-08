# APIs Externas — LeadsOS

## Z-API (WhatsApp)

**Envio:** `sendWhatsApp(phone, message)` — `services/notificationService.ts`
- Phone: formato `5511999999999` (sem + e sem caracteres especiais)
- Normalizar sempre via `normalizePhone()`

**Webhook recebido:** `POST /api/webhooks/zapi`
- Mensagens recebidas e enviadas pelo app
- Atualiza `first_response_at` no lead na primeira resposta humana/IA

---

## Autentique (Assinatura Digital)

**API:** GraphQL — `https://api.autentique.com.br/v2/graphql`
**Auth:** `Authorization: Bearer AUTENTIQUE_API_KEY`

**Criar documento:** `createSignatureDocument()` — `services/autentiqueService.ts`
```
Input: { title, pdfBase64, signerName, signerEmail?, signerPhone? }
Output: { documentId, signLink } // signLink = short_link curto
```
- Signer sem email/phone retorna `short_link` via API (confirmado)
- Autentique auto-adiciona o dono da conta como primeira assinatura

**Webhook:** `POST /api/webhooks/autentique`
- **Sem validação de secret** — Autentique não envia header de autenticação
- Payload: `body.event.type`, `body.event.data.id` (document id)
- Processar quando: `type === "document.finished"` OU `"document.signed"`

---

## Cora PJ (PIX + Boleto)

**Auth:** OAuth2 Client Credentials + mTLS
- Token endpoint: `https://matls-clients.api.cora.com.br/oauth2/token`
- mTLS: cert (CORA_CERT_BASE64) + key PKCS#8 (CORA_KEY_BASE64)
- Client ID: `CORA_CLIENT_ID` — **🔴 confirmar no portal Cora > Configurações > Integrações**

**Criar cobrança:** `createPixCharge()` — `services/coraService.ts`
```
Input: { amount, description, payerName, payerTaxId (CPF/CNPJ), daysUntilDue }
Output: { chargeId, pixCode (EMV), pixQrCode (Base64), boletoUrl }
```
- `payerTaxId` salvo no lead como `tax_id` (campo editável no dashboard)
- Fallback `"00000000000"` se não tiver — inválido, deve preencher antes

**Webhook:** `POST /api/webhooks/cora`
- Evento: `type === "invoice.paid"` ou `status === "PAID"`
- Busca proposta por `cora_charge_id`

**Sandbox vs Produção:** variável `CORA_API_ENV` (ausente = produção)

---

## Meta Ads (Facebook Lead Ads)

**Webhook:** `POST /api/webhooks/meta`
- Recebe leads de formulários do Facebook
- Processa via `saveMetaLead()` — `services/metaLeadsService.ts`
- UTMs: `utm_source = "meta_ads"`, `utm_medium = "cpc"`

---

## Google Ads (Lead Form Extension)

**Webhook:** `POST /api/webhooks/google`
- Auth: campo `google_key` no payload validado contra `GOOGLE_WEBHOOK_KEY`
- Extrai: FULL_NAME, PHONE_NUMBER, EMAIL, campaign_name, campaign_id, gclid
- `client_id` via campo customizado no formulário
- Processa via `saveGoogleLead()` — `services/googleLeadsService.ts`
- UTMs: `utm_source = "google_ads"`, `utm_medium = "cpc"`

**Pendente:** integração com Google Ads API para métricas de custo (CPL, CPC, CTR, ROAS)

---

## Resend (Email — a implementar)

**Uso:** email transacional + remarketing + sequências de nutrição
**API:** REST — `https://api.resend.com/emails`
**Auth:** `Authorization: Bearer RESEND_API_KEY`
**Grátis:** 3.000 emails/mês | **Pago:** $20/mês → 50k emails

```typescript
// Envio básico
POST https://api.resend.com/emails
{ from: "nome@dominio-do-cliente.com", to, subject, html }
```

**Variável:** `RESEND_API_KEY`
**Por cliente:** cada cliente configura domínio de envio no Resend (DNS)
**Plug-and-play:** inserir RESEND_API_KEY → email funcionando

---

## Cal.com (Agendamento — a implementar)

**Uso:** IA manda link de agenda quando lead está qualificado
**Integração:** só uma URL por cliente, sem API
**Variável:** `CAL_BOOKING_URL` (por cliente, salvo no Firestore do cliente)
**Grátis:** sim (open source, hospedado no cal.com)

---

## Z-API Multi-instância (a implementar)

**Uso:** cada cliente/negócio com seu próprio número de WhatsApp
**Hoje:** 1 instância global
**Futuro:** cada cliente salva ZAPI_INSTANCE_ID + ZAPI_TOKEN no dashboard
**Custo:** ~R$70/instância/mês — repassar ao cliente

---

## Firebase Firestore

**Collections principais:**
- `leads` — dados do lead + status + score + tax_id + notes
- `proposals` — propostas com status, pix_code, boleto_url, cora_charge_id
- `conversations` — mensagens por lead
- `followup_jobs` — jobs persistidos (resistentes a restart)
- `clients` — clientes/tenants
- `users` — usuários do sistema
- `logs` — auditoria de ações
- `templates` — mensagens por cliente/trigger
- `playbooks` — templates por nicho

**Regra:** sempre usar Admin SDK server-side via `getAdminDb()`.
