# LeadsOS — Contexto para Claude Code

**Autor:** Robson Jorge Pereira Silva (Robson Catatal) — projeto proprietário.

## Stack
- Next.js 14 App Router + TypeScript
- Firebase Firestore (Admin SDK server-side — nunca client-side em APIs)
- Anthropic Claude (Haiku para sugestões, Sonnet para SDR)
- Z-API (WhatsApp)
- Autentique (assinatura digital — GraphQL)
- Cora PJ (PIX/Boleto — OAuth2 + mTLS)
- Vercel (deploy sempre via `npx vercel --prod --yes` em C:\projetos\leadsOS)
- cron-job.org → `/api/cron/process-followups` (1 min)

## Regras absolutas
- **Deploy:** sempre `npx vercel --prod --yes`. GitHub auto-deploy não funciona.
- **Firestore:** usar `getAdminDb()` de `@/lib/firebase-admin` em toda API route.
- **Auth:** todas as rotas protegidas usam `getSessionUser(req)` de `@/lib/getSessionUser`.
- **Telefone:** sempre normalizar via `normalizePhone()` de `@/lib/normalizePhone`.
- **TypeScript:** sem `any` explícito, sem `eslint-disable` desnecessário.
- **Testes:** deixar para o final do projeto — não criar agora.
- **Não criar** helpers/utilitários para uso único.

## Estrutura de pastas
```
app/api/          → API routes (Next.js route handlers)
app/dashboard/    → Pages do dashboard (client components)
services/         → Lógica de negócio e integrações externas
lib/              → Utilitários (firebase-admin, auth, normalizePhone)
types/            → Tipos TypeScript compartilhados
docs/             → PROJETO.md e CHANGELOG.md
```

## Serviços externos — resumo rápido

### Z-API (WhatsApp)
- Envio: `sendWhatsApp(phone, message)` de `@/services/notificationService`
- Webhook recebido em `/api/webhooks/zapi`

### Autentique (assinatura digital)
- `createSignatureDocument()` de `@/services/autentiqueService`
- Retorna `documentId` e `signLink` (short_link)
- Webhook em `/api/webhooks/autentique` — **não valida secret** (Autentique não envia)
- Evento: `body.event.type === "document.finished"`, doc id em `body.event.data.id`

### Cora (PIX/Boleto)
- `createPixCharge()` de `@/services/coraService`
- mTLS: CORA_CERT_BASE64 + CORA_KEY_BASE64 (PKCS#8)
- CORA_CLIENT_ID: `int-5aCedWVEhgS8JSTM4l6Ny3` — **pendente confirmar no portal**
- Webhook em `/api/webhooks/cora` — evento `invoice.paid`

### Anthropic (IA)
- Sugestão de resposta: `/api/ai/reply` (Haiku)
- Auto-reply por lead: campo `ai_reply` no Firestore

## Pipeline de lead
```
novo → contato → proposta → fechado | perdido
```
Status em português no Firestore. Normalizar legado com `STATUS_MAP` no dashboard.

## Fluxo de proposta (Fase 10)
```
POST /api/proposals
  → gera PDF (@react-pdf/renderer)
  → cria doc Autentique → retorna sign_link
  → salva no Firestore (status: awaiting_signature)
  → envia link via WhatsApp

Webhook Autentique (document.finished)
  → status: signed
  → createPixCharge (Cora)
  → status: awaiting_payment + pix_code + boleto_url
  → envia PIX via WhatsApp

Webhook Cora (invoice.paid)
  → status: paid + paid_at
  → lead → fechado
  → mensagem de onboarding via WhatsApp
```

## Variáveis de ambiente (Vercel)
FIREBASE_ADMIN_KEY_JSON, JWT_SECRET, ZAPI_API_KEY, ZAPI_INSTANCE_ID,
AUTENTIQUE_API_KEY, CORA_CLIENT_ID, CORA_CERT_BASE64, CORA_KEY_BASE64,
CORA_API_ENV, AGENCY_NAME, ONBOARDING_MESSAGE, CRON_SECRET, REPORTS_API_TOKEN,
GOOGLE_WEBHOOK_KEY

## Visão do produto (atualizada 2026-03-18)

**Departamento comercial autônomo de IA** rodando 24h para N negócios (Beace + clientes da Beace).
Humano entra só para supervisionar, ajustar estratégia e fechar casos escalados pela IA.

Funciona para dois públicos:
1. **Interno** — negócios da Beace e do Robson (sem interface de cliente, acesso admin total)
2. **Clientes da Beace** — cada cliente tem seus leads isolados, portal limpo, WhatsApp próprio

## Roadmap de features pendentes (prioridade)

### Prioridade 1 — Autonomia da IA
- [ ] SDR de IA: qualifica, oferece, negocia via WhatsApp (desbloqueado com créditos Anthropic)
- [ ] Closer de IA: responde dúvidas da proposta, cria urgência, reengaja sumidos
- [ ] Base de conhecimento por cliente (nicho, tom, objeções, proposta de valor, casos de sucesso)
- [ ] Sequência de nutrição multi-step (não só 1 follow-up — Dia 1, 3, 7, 15)
- [ ] Sequência pós-proposta (lead recebeu e sumiu — abordagem diferente de lead frio)
- [ ] Recuperação de base fria (leads antigos sem resposta → campanha de reativação)

### Prioridade 2 — Remarketing multicanal
- [ ] Email via Resend (plug-and-play: RESEND_API_KEY + domínio do cliente)
- [ ] Sequência de remarketing: lead não comprou → régua email + WhatsApp combinados
- [ ] Onboarding completo pós-pagamento: boas-vindas + coleta de dados + kickoff

### Prioridade 3 — Visibilidade e supervisão
- [ ] War Room / TV Dashboard — painel ao vivo, sem login, atualiza a cada 30s
  - Mostra: leads hoje, em conversa, propostas abertas, receita, atividade ao vivo
  - Funciona em TV (1920px+), tablet e mobile
  - URL com token fixo (sem login)
- [ ] Notificação WhatsApp para supervisor (lead quente, proposta assinada, IA escalou)
- [ ] IA de análise: insights automáticos (melhor horário, nicho que mais converte, alertas)
- [ ] Resumo semanal automático para o dono via WhatsApp

### Prioridade 4 — Automação por comportamento (gatilhos)
- [ ] Abriu LP mas não mandou mensagem → mensagem proativa em 30min
- [ ] Leu proposta mas não assinou em 48h → reengajamento
- [ ] Lead sumido 30 dias → campanha de reativação
- [ ] Novo lead de score alto → notificação imediata ao supervisor
- [ ] Scoring automático (canal origem, velocidade de resposta, mensagens trocadas, LP aberta)

### Prioridade 5 — Multi-instância e portal cliente
- [ ] Multi-instância Z-API: cada cliente configura ZAPI_INSTANCE_ID + ZAPI_TOKEN próprios
- [ ] Agendamento via Cal.com: IA manda link quando lead está pronto (CAL_BOOKING_URL por cliente)
- [ ] Portal do cliente separado: visão limpa (leads, conversas, relatório, botão falar com Beace)
- [ ] Domínio próprio na LP (cliente aponta DNS → LP white label no domínio dele)

### Prioridade 6 — UX e responsividade
- [ ] Redesign completo do dashboard (dark theme consistente com a LP)
- [ ] Responsividade total: mobile, tablet, TV
- [ ] Empty states e loading skeletons
- [ ] Toasts em vez de alerts
- [ ] Timeline de eventos por lead

## Serviços externos plug-and-play

| Serviço | Variável | Custo | Grátis? |
|---|---|---|---|
| Resend (email) | RESEND_API_KEY | $20/mês 50k emails | Sim, 3k/mês |
| Cal.com (agenda) | CAL_BOOKING_URL | $0 | Sim (open source) |
| Z-API extra | por cliente no dashboard | ~R$70/instância/mês | Não |
| Outscraper | OUTSCRAPER_API_KEY | ~$0.002/resultado | Não |

Regra: serviços pagos são repassados como custo de infraestrutura ao cliente ou incluídos no pacote.

## Workflow do dia (combinado)
1. Implementar tudo primeiro
2. Testes e conexões externas por último
3. Deploy no final de cada bloco de features
