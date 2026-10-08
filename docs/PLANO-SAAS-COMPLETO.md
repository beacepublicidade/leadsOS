# LeadsOS — Plano de Expansão para SaaS Completo

> Atualizado em: 2026-10-01
> Visão: Transformar o LeadsOS em um hub comercial + financeiro + jurídico + agência completo,
> onde a IA trabalha de ponta a ponta e o humano supervisiona.

---

## Visão Geral da Plataforma

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          LeadsOS Platform                               │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────┤
│  CRM + SDR   │   Agência    │  Financeiro  │   Jurídico   │  Canais    │
│  (existe)    │  (fase 2)    │  (fase 3)    │  (fase 2)    │  (fase 4)  │
├──────────────┴──────────────┴──────────────┴──────────────┴────────────┤
│                      IA trabalhando 24h em tudo                         │
├─────────────────────────────────────────────────────────────────────────┤
│                  Portal do Cliente (fase 2/3)                           │
└─────────────────────────────────────────────────────────────────────────┘
```

**Fluxo completo desejado:**
```
Lead via campanha (Meta/Google/Instagram/WhatsApp)
  → LeadsOS CRM → IA SDR qualifica via WhatsApp/Instagram
  → Lead aceita proposta
  → Contrato gerado e assinado digitalmente (Módulo Jurídico)
  → Cliente cadastrado automaticamente na Agência
  → Serviço/produto associado criado com entregáveis mensais
  → Cobrança recorrente gerada (Módulo Financeiro)
  → NFS-e emitida automaticamente
  → Dashboard financeiro e de agência atualiza em tempo real
```

---

## Fase 1 — CRM + SDR IA (CONCLUÍDA ✅)

O que já existe:
- Leads pipeline (Kanban + tabela)
- IA SDR via WhatsApp (Z-API + Anthropic)
- Propostas com PDF + assinatura (Autentique) + PIX (Cora)
- Dashboard BI (Central BI com 7 abas)
- War Room / TV Dashboard
- Prospecção IA (Outscraper + Google Maps)
- Relatórios e insights IA
- Multi-cliente (isolamento por client_id)

---

## Fase 2 — Módulo Agência + Jurídico

### 2A. Módulo Agência (estilo Operandi)

**Referências open source pesquisadas:**

| Projeto | Stars | Stack | O que aproveitar |
|---|---|---|---|
| **AgencyOS** | ~953 | Nuxt 3 + Directus | CRM, portal cliente, pipeline, entregáveis, templates de projeto |
| **Worklenz** | — | Angular + Node | Time tracking, profitabilidade, orçamento vs. real |
| **AgencyDesk** | — | Laravel + Livewire | Marcos de projeto, entregáveis privados, aprovações |

**Decisão:** Construir nativo no LeadsOS (Next.js) inspirado no AgencyOS + Operandi.
Não integrar projeto externo — manter stack única.

**Funcionalidades do Módulo Agência:**

```
/dashboard/agencia
├── /clientes          → Lista de clientes ativos (vindos do CRM)
│   └── /[id]          → Perfil completo: briefing, histórico, projetos, financeiro
├── /projetos          → Todos os projetos ativos por cliente
│   └── /[id]          → Board kanban de tasks + entregáveis + timeline
├── /entregaveis       → Visão consolidada do que está para entrar no mês
├── /equipe            → Atribuição de responsáveis por projeto/task
├── /relatorios        → Templates de relatório mensal automáticos por cliente
└── /portal-cliente    → Login separado para o cliente ver só o dele
```

**Modelo de dados (Firestore):**

```typescript
// Collection: agencies_clients
{
  id: string;
  lead_id: string;          // referência ao lead que virou cliente
  name: string;
  cnpj?: string;
  briefing: string;         // resumo do negócio e objetivos
  niche: string;
  responsible: string;      // usuário responsável
  status: "ativo" | "pausado" | "encerrado";
  start_date: string;
  contract_id?: string;     // referência ao contrato assinado
  monthly_value: number;
  created_at: string;
}

// Collection: agency_projects
{
  id: string;
  client_id: string;
  name: string;             // ex: "Gestão Social Media — Outubro/2026"
  month: string;            // "2026-10"
  status: "planejamento" | "execucao" | "revisao" | "entregue";
  tasks: AgencyTask[];
  deliverables: Deliverable[];
  responsible: string;
  deadline: string;
}

// AgencyTask
{
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  assignee: string;
  due_date: string;
  notes?: string;
}

// Deliverable
{
  id: string;
  title: string;            // ex: "12 posts feed", "4 reels", "relatório mensal"
  status: "pendente" | "em_producao" | "aguardando_aprovacao" | "aprovado";
  file_url?: string;
  approved_at?: string;
  approved_by?: string;     // nome/email do cliente que aprovou
}
```

**Features de automação:**
- Quando lead fecha no CRM → cria cliente na agência automaticamente
- Dia 1 de cada mês → cria projeto mensal baseado no template do pacote contratado
- Entregável aprovado → notifica responsável via WhatsApp
- Fim do mês → gera relatório automático com resultados do período

---

### 2B. Módulo Jurídico (Contratos Digitais)

**Referências open source pesquisadas:**

| Projeto | Stars | Stack | Validade Legal BR |
|---|---|---|---|
| **Documenso** | 14k+ | TypeScript/React/Postgres | Sim (com cert ICP-Brasil) |
| **LibreSign** | — | PHP/Nextcloud | Sim (ICP-Brasil nativo) |
| **OpenSign** | — | MIT | Setup mais simples, menos rigoroso |
| **Signara** | — | Multi-tenant | DocuSign replacement |

**Decisão:** Manter **Autentique** (já integrado, funciona, tem validade jurídica no BR).
Criar sistema de **templates de contrato por tipo de serviço**.

**Funcionalidades do Módulo Jurídico:**

```
/dashboard/juridico
├── /contratos         → Lista de todos os contratos (por cliente, status, valor)
│   └── /[id]          → Visualizar contrato, histórico de assinatura, download PDF
├── /templates         → Templates de contrato por tipo de serviço
│   └── /[id]          → Editor de template com variáveis dinâmicas
└── /configuracoes     → Dados da empresa (para preencher contratos), certificado digital
```

**Templates de contrato com variáveis dinâmicas:**

```
{{CLIENTE_NOME}} {{CLIENTE_CNPJ}} {{CLIENTE_ENDERECO}}
{{SERVICO_NOME}} {{SERVICO_VALOR}} {{SERVICO_DESCRICAO}}
{{DURACAO_MESES}} {{DATA_INICIO}} {{DATA_TERMINO}}
{{FORMA_PAGAMENTO}} {{DIA_VENCIMENTO}}
{{AGENCIA_NOME}} {{AGENCIA_CNPJ}} {{REPRESENTANTE_NOME}}
```

**Fluxo automático:**
```
Lead fecha proposta
  → Seleciona template de contrato do produto
  → Sistema preenche variáveis automaticamente
  → Envia para assinatura via Autentique
  → Webhook Autentique (document.finished) → status "assinado"
  → PDF armazenado no Firestore Storage
  → Cliente cadastrado na agência
  → Cobrança criada no financeiro
```

**Parceiros de assinatura digital (custo):**
- **Autentique:** já integrado — planos a partir de R$29/mês (50 documentos)
- **DocuSign:** a partir de $10/mês/usuário
- **D4Sign:** a partir de R$69/mês (100 documentos) — alternativa BR com ICP-Brasil

---

## Fase 3 — Módulo Financeiro (estilo Asaas)

### Pesquisa de open source:

**Não existe um projeto open source que replique o Asaas completamente.**

Os projetos encontrados cobrem partes:

| Projeto | O que cobre | O que falta |
|---|---|---|
| **Lago** (GitHub: getlago/lago) | Billing engine, recorrência, invoicing, analytics | PIX/boleto nativo, NF-e |
| **Kill Bill** | Billing completo, dunning, multi-moeda, portal | PIX/boleto nativo, NF-e, configuração complexa |
| **Invoice Ninja** | Invoicing, recorrência, 40+ gateways, portal | PIX/boleto (gateways BR via plugin) |
| **BRCobranca/boleto-cnab-api** | Boleto bancário + PIX (building block) | Não é plataforma, só lib |
| **OpenBoleto** | Geração de boleto PDF (PHP) | Não é plataforma |

**Decisão:** Construir nativo no LeadsOS. Usar Cora (já integrado) para PIX/boleto.
Inspirar no layout e UX do Asaas, mas implementação própria.

### Funcionalidades do Módulo Financeiro:

```
/dashboard/financeiro
├── /visao-geral       → Dashboard: saldo, recebimentos do mês, a vencer, inadimplência
├── /contas-receber    → Lista de cobranças (boleto/PIX/cartão) + status
│   └── /[id]          → Detalhe da cobrança: histórico, tentativas, envio
├── /contas-pagar      → Despesas e obrigações (manual ou integrado)
├── /recorrencias      → Assinaturas e contratos mensais recorrentes
│   └── /[id]          → Configurar ciclo, valor, vencimento, tolerância
├── /notas-fiscais     → NFS-e emitidas + status + download XML/PDF
├── /fluxo-caixa       → Gráfico de entradas/saídas por período
├── /relatorios        → DRE simplificado, inadimplência, receita por cliente
└── /configuracoes     → Dados fiscais (CNPJ, inscrição municipal), integração NF-e
```

**Modelo de dados (Firestore):**

```typescript
// Collection: financial_charges
{
  id: string;
  client_id: string;
  description: string;
  amount: number;
  due_date: string;
  status: "pendente" | "pago" | "vencido" | "cancelado";
  type: "pix" | "boleto" | "cartao" | "transferencia";
  pix_code?: string;
  boleto_url?: string;
  boleto_barcode?: string;
  cora_invoice_id?: string;
  paid_at?: string;
  nfse_id?: string;
  nfse_number?: string;
  nfse_pdf_url?: string;
  nfse_xml_url?: string;
  recurrence_id?: string;   // se faz parte de uma recorrência
  created_at: string;
}

// Collection: financial_recurrences
{
  id: string;
  client_id: string;
  description: string;
  amount: number;
  day_of_month: number;     // dia do vencimento (1-28)
  payment_type: "pix" | "boleto";
  status: "ativa" | "pausada" | "encerrada";
  start_date: string;
  end_date?: string;
  next_charge_date: string;
  tolerance_days: number;   // dias de tolerância antes de marcar como inadimplente
  auto_nfse: boolean;       // emitir NFS-e automaticamente após pagamento
  created_at: string;
}

// Collection: financial_expenses
{
  id: string;
  description: string;
  amount: number;
  category: string;         // "ferramentas", "pessoal", "marketing", "infra", etc.
  due_date: string;
  paid: boolean;
  paid_at?: string;
  client_id?: string;       // se é custo direto de um cliente
  notes?: string;
  created_at: string;
}
```

**Automações financeiras:**
```
Recorrência ativa + dia do vencimento chegou
  → Cria cobrança no Cora (PIX ou boleto)
  → Envia link de pagamento via WhatsApp para o cliente
  → Webhook Cora (invoice.paid) → marca como pago
  → Se auto_nfse: chama API Focus NFe → emite NFS-e
  → Envia NFS-e por email/WhatsApp para o cliente
  → Dashboard financeiro atualiza

Lead fecha → proposta aprovada
  → Cria recorrência mensal automaticamente
  → Gera primeira cobrança pro rata (se necessário)
  → Dispara fluxo de contrato (Módulo Jurídico)
```

### API de NFS-e Recomendada: Focus NFe

**Por que Focus NFe:**
- Menor custo de entrada: R$89,90/mês (1 CNPJ, 100 notas)
- Sem setup fee, sem contrato mínimo
- Cobertura de 1.200+ prefeituras
- Suporte a NF-e, NFS-e, NFC-e, CT-e, MDF-e
- API REST bem documentada

**Outras opções:**

| API | Plano entrada | Notas/mês | Obs. |
|---|---|---|---|
| **Focus NFe** | R$89,90/mês | 100 (1 CNPJ) | Melhor custo-benefício |
| **Notaas** | R$0 (free) | 50 | Bom para dev/testes |
| **eNotas** | R$137/mês | 60 | Mais usado por SaaS BR |
| **NFE.io** | R$171/mês | 250 | Onboarding assistido |
| **Spedy** | R$89/mês | 150 | Mais notas no mesmo preço |

**Integração Focus NFe (exemplo):**

```typescript
// services/focusnfeService.ts
const FOCUS_NFE_BASE = "https://api.focusnfe.com.br/v2";
const FOCUS_NFE_TOKEN = process.env.FOCUS_NFE_TOKEN;

export async function emitirNFSe(params: {
  tomador_cnpj: string;
  tomador_razao_social: string;
  tomador_email: string;
  valor_servicos: number;
  discriminacao: string;
  codigo_servico: string;
  client_id: string;
  charge_id: string;
}) {
  const res = await fetch(`${FOCUS_NFE_BASE}/nfse`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(FOCUS_NFE_TOKEN + ":")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data_emissao: new Date().toISOString().split("T")[0],
      prestador: {
        cnpj: process.env.COMPANY_CNPJ,
        inscricao_municipal: process.env.COMPANY_IM,
        codigo_municipio: process.env.COMPANY_CITY_CODE,
      },
      tomador: {
        cnpj: params.tomador_cnpj,
        razao_social: params.tomador_razao_social,
        email: params.tomador_email,
      },
      itens: [{
        discriminacao: params.discriminacao,
        quantidade: 1,
        valor_unitario: params.valor_servicos,
        codigo_servico: params.codigo_servico,
        iss_retido: false,
      }],
    }),
  });
  return await res.json();
}
```

### Cora (já integrado) — PIX + Boleto

```typescript
// Já existe em services/coraService.ts:
// createPixCharge(amount, description, dueDate) → { pix_code, boleto_url }

// Webhook: /api/webhooks/cora
// Evento: invoice.paid → marca cobrança como paga → dispara NFS-e
```

---

## Fase 4 — Canais de Atendimento

### WhatsApp (Z-API) — JÁ EXISTE ✅

```
/api/webhooks/zapi  → recebe mensagens
sendWhatsApp()      → envia mensagens
```

### Instagram DM (Meta Graph API) — FASE 4

**O que é necessário:**
1. Conta Instagram Business (ou Creator) vinculada a uma Facebook Page
2. App Meta (já existe para Meta Ads → aproveitar o mesmo)
3. Permissões necessárias:
   - `instagram_manage_messages`
   - `pages_messaging`
   - `instagram_business_manage_messages`
4. App Review da Meta (5–10 dias úteis para produção)
5. Webhook HTTPS configurado para `messages` e `messaging_postbacks`

**Regras importantes:**
- Janela de 24h: pode responder livremente nas 24h após mensagem do usuário
- Fora da janela: só com "Human Agent tag" (7 dias) ou templates aprovados
- Em dev mode: até 25 usuários de teste, sem review

**Integração:**

```typescript
// services/instagramService.ts

const IG_API = "https://graph.facebook.com/v20.0";

export async function sendInstagramDM(recipientId: string, text: string) {
  const res = await fetch(`${IG_API}/${process.env.IG_PAGE_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.META_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE",
    }),
  });
  return res.json();
}

// Webhook: /api/webhooks/instagram
// Mesmo padrão do /api/webhooks/zapi
// Lead criado automaticamente quando nova DM chega de novo usuário
```

### Facebook Messenger — FASE 4

```
Mesmo App Meta → adicionar permissão pages_messaging
Endpoint: POST /{page-id}/messages (mesmo da IG)
Webhook: /api/webhooks/facebook
```

### Formulário de site próprio — JÁ EXISTE ✅

```
/api/webhooks/form  → cria lead automaticamente
LP em /lp           → já implementado
```

### Resumo de canais:

| Canal | Status | API | Custo |
|---|---|---|---|
| WhatsApp | ✅ Ativo | Z-API | ~R$70/instância/mês |
| Instagram DM | 🔜 Fase 4 | Meta Graph API | Grátis (dentro do Meta Business) |
| Facebook Messenger | 🔜 Fase 4 | Meta Graph API | Grátis |
| Site / LP | ✅ Ativo | Própria | Grátis |
| Email | 🔜 Roadmap | Resend | Grátis até 3k emails/mês |

---

## Fases de Implementação

### Fase 2 — Agência + Jurídico (próxima)

**Duração estimada:** 2 semanas de desenvolvimento

**Entregáveis:**
1. Módulo Agência:
   - [ ] `/dashboard/agencia/clientes` — lista de clientes (vindos do CRM)
   - [ ] `/dashboard/agencia/clientes/[id]` — perfil com briefing, projetos, financeiro
   - [ ] `/dashboard/agencia/projetos` — board por cliente + entregáveis
   - [ ] Automação: lead fecha → vira cliente automaticamente
   - [ ] Automação: dia 1 do mês → cria projeto mensal pelo template

2. Módulo Jurídico:
   - [ ] `/dashboard/juridico/templates` — editor de templates de contrato
   - [ ] Variáveis dinâmicas preenchidas automaticamente
   - [ ] Fluxo: proposta aprovada → gera contrato → envia Autentique → armazena PDF

**APIs adicionais:**
- Nenhuma nova (aproveita Autentique já integrado)

---

### Fase 3 — Financeiro (depois da agência)

**Duração estimada:** 2-3 semanas de desenvolvimento

**Entregáveis:**
1. [ ] `/dashboard/financeiro/visao-geral` — dashboard com KPIs financeiros
2. [ ] `/dashboard/financeiro/contas-receber` — cobranças com status
3. [ ] `/dashboard/financeiro/recorrencias` — assinaturas mensais
4. [ ] `/dashboard/financeiro/notas-fiscais` — NFS-e emitidas
5. [ ] `/dashboard/financeiro/fluxo-caixa` — gráfico de entradas/saídas
6. [ ] Automação: recorrência → gera cobrança Cora → envia WhatsApp
7. [ ] Automação: pagamento confirmado → emite NFS-e automaticamente

**APIs novas:**
- Focus NFe: R$89,90/mês (ou Notaas free para desenvolvimento)
- Variável: `FOCUS_NFE_TOKEN`, `COMPANY_CNPJ`, `COMPANY_IM`, `COMPANY_CITY_CODE`

**Novos webhooks:**
- `/api/cron/generate-monthly-charges` (cron-job.org, dia 1 às 8h)
- `/api/webhooks/focusnfe` (confirmação de emissão)

---

### Fase 4 — Canais de Atendimento

**Duração estimada:** 1 semana

**Entregáveis:**
1. [ ] Instagram DM → lead automático + IA SDR
2. [ ] Facebook Messenger → lead automático + IA SDR
3. [ ] Caixa de conversas unificada (WhatsApp + Instagram + Facebook na mesma tela)

**Pré-requisito:** App Review da Meta aprovado (solicitar com antecedência de 2 semanas)

---

## Stack Completa da Plataforma

```
Frontend:    Next.js 14 App Router + TypeScript (sem Tailwind)
Database:    Firebase Firestore (migrar para Supabase — fase futura)
Auth:        JWT próprio (getSessionUser)
IA:          Anthropic Claude (Haiku SDR, Sonnet análise)
WhatsApp:    Z-API
Assinatura:  Autentique
PIX/Boleto:  Cora PJ
NF-e:        Focus NFe (fase 3)
Instagram:   Meta Graph API (fase 4)
Deploy:      Vercel (npx vercel --prod --yes)
Cron:        cron-job.org
```

---

## Custos Mensais Estimados (escala inicial)

| Serviço | Custo/mês | Quando entra |
|---|---|---|
| Vercel (Pro) | ~$20 | Agora |
| Firebase (Spark → Blaze) | ~R$50 | Agora (tráfego) |
| Anthropic Claude | ~$20–100 | Agora (por uso) |
| Z-API (WhatsApp) | ~R$70/instância | Agora |
| Autentique | ~R$29–99 | Agora |
| Cora PJ | % da transação | Agora |
| Focus NFe | R$89,90 | Fase 3 |
| Meta Graph API (IG/FB) | R$0 | Fase 4 |
| Resend (email) | R$0–$20 | Roadmap |
| **Total estimado** | **~R$500–900/mês** | — |

---

## Estrutura de Pastas Proposta

```
app/
├── dashboard/
│   ├── agencia/            ← NOVO (Fase 2)
│   │   ├── page.tsx        ← overview da agência
│   │   ├── clientes/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── projetos/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   ├── juridico/           ← NOVO (Fase 2)
│   │   ├── page.tsx
│   │   ├── contratos/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── templates/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   └── financeiro/         ← NOVO (Fase 3)
│       ├── page.tsx        ← visão geral
│       ├── contas-receber/
│       ├── recorrencias/
│       ├── notas-fiscais/
│       └── fluxo-caixa/
├── api/
│   ├── agency/             ← NOVO
│   ├── financial/          ← NOVO
│   ├── legal/              ← NOVO
│   └── webhooks/
│       ├── instagram/      ← NOVO (Fase 4)
│       ├── facebook/       ← NOVO (Fase 4)
│       └── focusnfe/       ← NOVO (Fase 3)
services/
├── agencyService.ts        ← NOVO
├── financialService.ts     ← NOVO
├── focusnfeService.ts      ← NOVO
└── instagramService.ts     ← NOVO (Fase 4)
```

---

## Variáveis de Ambiente Novas

```bash
# Fase 2 — Jurídico (já existe Autentique)
# Nenhuma nova variável necessária

# Fase 3 — Financeiro / NF-e
FOCUS_NFE_TOKEN=          # token da API Focus NFe
COMPANY_CNPJ=             # CNPJ da Beace
COMPANY_IM=               # Inscrição Municipal da Beace
COMPANY_CITY_CODE=        # Código IBGE do município
COMPANY_SERVICE_CODE=     # Código LC116 do serviço prestado

# Fase 4 — Instagram / Facebook
META_ACCESS_TOKEN=        # token da conta Meta Business
IG_PAGE_ID=               # ID da página do Facebook vinculada ao Instagram
IG_WEBHOOK_VERIFY_TOKEN=  # token de verificação do webhook
```

---

## Referências e Links

### Open Source de Referência
- AgencyOS: https://github.com/directus-labs/agency-os
- Worklenz: https://worklenz.com/open-source-agency-management/
- Lago (billing): https://github.com/getlago/lago
- Invoice Ninja: https://github.com/invoiceninja/invoiceninja
- Documenso (e-sign): https://github.com/documenso/documenso
- LibreSign (BR, ICP-Brasil): https://libresign.coop
- OpenSign: https://github.com/opensignlabs/opensign
- BRCobranca (boleto/PIX): https://github.com/topics/boleto

### APIs Brasileiras
- Focus NFe: https://focusnfe.com.br (recomendado)
- eNotas: https://enotas.com.br
- Notaas: https://www.notaas.com.br (free tier para dev)
- NFE.io: https://nfe.io
- Cora PJ (já integrado): webhook em /api/webhooks/cora

### Meta / Instagram
- Instagram Messaging API: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/
- App Review: https://developers.facebook.com/docs/app-review

---

*Documento gerado com base em pesquisa de mercado realizada em 2026-10-01.*
*Atualizar conforme decisões de implementação forem tomadas.*
