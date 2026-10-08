# CHANGELOG — LeadsOS

> Histórico de versões e entregas do departamento comercial autônomo com IA.

---

## [v1.1.0] — 2026-03-18

### Automação Avançada & Inteligência

**Scoring automático de leads (0–100)**
- Score calculado por: dados preenchidos, origem do tráfego, engajamento (contagem de mensagens recebidas), status no funil, keywords de campanha
- Calculado na criação do lead (POST /api/leads) e recalculado a cada mensagem recebida (webhook Z-API)
- Supervisor notificado automaticamente quando score ≥ 75

**Follow-up automatizado em 3 steps**
- Step 1: 10 minutos após captura
- Step 2: 24 horas
- Step 3: 3 dias
- Cancela automaticamente se lead converter (proposta/fechado) ou estiver em modo humano
- Usa credenciais Z-API por cliente (fallback para global)

**Gatilhos comportamentais (cron por hora)**
- Leads "novo" sem contato por > 2h → notificação ao supervisor
- Leads "contato" sem avanço por > 48h → notificação ao supervisor
- Propostas awaiting_signature por > 2 dias → lembrete WhatsApp ao lead

**Notificações WhatsApp ao supervisor**
- Hot lead (score ≥ 75): disparo único por lead via `supervisor_hot_notified`
- Conversão (proposta/fechado): notificação imediata
- Lead estagnado: throttle de 12h (novo) e 24h (contato)
- Configurado via env var `SUPERVISOR_PHONE`

**Remarketing por email (Resend)**
- Email HTML brandado com nome do cliente/nicho
- Leads com email, status ≠ fechado, sem contato por 3+ dias
- Máximo 1 email por lead por 7 dias
- Variáveis: `RESEND_API_KEY`, `RESEND_FROM`

**Multi-instância WhatsApp por cliente**
- Credenciais Z-API por cliente armazenadas no Firestore (`zapi_instance_id`, `zapi_token`, `zapi_client_token`)
- `sendWhatsAppForLead()` resolve credenciais automaticamente, com fallback para variáveis globais
- Configurável no dashboard admin (modal de edição do cliente)

**IA de análise — Insights do pipeline**
- Endpoint `POST /api/ai/insights`: envia dados do funil para Claude Haiku
- Dashboard em `/dashboard/insights` com cards KPI, gráficos de barras e análise textual
- Sumariza por status, origem, receita, score médio e total de leads

**Portal do Cliente (público, brandado)**
- Rota pública `/portal?t=TOKEN` sem login
- Token gerado via `POST /api/portal/token` e copiado com 1 clique na listagem de clientes
- Mostra: KPIs (total, fechados este mês, receita, score médio), funil visual, tabela de leads recentes
- Brandado com cor e logo do cliente
- Sem exposição de dados sensíveis (telefone/email omitidos)

**Responsividade**
- Sidebar mobile com hamburger já existente
- Tabelas com scroll horizontal em mobile (`min-width: 600px`)
- Modais full-screen no mobile (slide from bottom)
- Classes utilitárias: `.hide-mobile`, `.show-mobile`, `.mobile-stack`, `.kanban-board`, `.kanban-col`
- Toast container adaptado para mobile

---

## [v1.0.0] — 23/03/2026 (previsto)

### Fundação completa do produto

Esta é a primeira versão oficial do LeadsOS. Cobre todo o ciclo básico de um departamento comercial: captura, atendimento, pipeline, automação e relatórios — com suporte multi-cliente e controle de acesso por perfil.

---

### Autenticação & Segurança
- Login com email e senha (JWT + httpOnly cookies)
- Proteção de rotas via middleware
- Perfis de acesso: Admin, Gestor, Vendedor
- Admin vê todos os clientes; Vendedor vê apenas os próprios leads
- Redirecionamento automático para páginas não autorizadas
- Senhas com hash bcrypt (salt 12)

---

### Gestão de Clientes (Multi-tenant)
- Cadastro de clientes com nome, nicho e WhatsApp
- White label por cliente — cor da marca aplicada na Landing Page
- URL de Landing Page gerada automaticamente por cliente
- Edição e exclusão de clientes
- Templates de mensagens criados automaticamente por nicho ao cadastrar cliente (via playbooks ou IA)

---

### Gestão de Usuários
- Cadastro de usuários com nome, email, senha, perfil e empresa
- Edição de nome, perfil, senha e empresa vinculada
- Exclusão de usuários (somente Admin)
- Vendedor vinculado a uma empresa específica

---

### Captura de Leads
- Landing Page pública com formulário de captura (nome, telefone, email)
- Captura automática de UTMs: source, medium, campaign, content, term
- Integração Meta Ads via webhook (Facebook Lead Ads)
- Criação manual de leads pelo dashboard
- Lead vinculado ao cliente correto via client_id na URL
- Normalização de telefone centralizada

---

### WhatsApp & Conversas
- Integração Z-API para envio e recebimento de mensagens
- Webhook que processa mensagens recebidas e enviadas pelo app
- Suporte a mídia: áudio (player), imagem e documentos
- Histórico completo de conversas por lead
- Atualização automática a cada 5 segundos
- Avatares com iniciais por tipo de remetente (IA, humano, lead)
- Nome do atendente exibido em negrito no WhatsApp do cliente
- **Human Takeover** — atendente assume conversa por 30 minutos
- Retomada de automação com 1 clique
- Modo da conversa exibido no dashboard (Auto / Humano)
- Busca de lead por telefone sem limite de registros (query direta no Firestore)

---

### Automação & IA
- Follow-ups automáticos persistidos no Firestore (10 min e 24h)
- Follow-up pausado automaticamente durante Human Takeover
- Templates de mensagens por trigger de status (contato, proposta, fechado)
- Templates por cliente com fallback global
- Interpolação de variáveis nos templates: {{name}}, {{phone}}
- Sugestão de resposta por IA (Claude Haiku)
- Auto-reply IA ativável por lead individualmente
- Sistema de playbooks por nicho para criação automática de templates
- Score de qualificação de leads

---

### CRM & Pipeline
- Visualização em lista (tabela) e Kanban
- 5 estágios do pipeline: Novo, Contato, Proposta, Fechado, Perdido
- Movimentação de leads entre estágios (◀ ▶ no Kanban)
- Tempo no estágio com alerta visual por cor (verde → vermelho)
- Filtros por status, origem e campanha
- Busca por nome, email e telefone
- Filtro por período (data de início e fim)
- Exportação CSV e JSON (Admin e Gestor)
- Exclusão de leads
- Agendamento de follow-up por lead

---

### Relatórios
- Total de leads captados
- Leads do mês atual
- Taxa de conversão (Novo → Fechado)
- SLA médio de primeiro contato (em minutos)
- Gráfico de leads por dia (últimos 30 dias)
- Funil por status do pipeline
- Leads por origem (Meta Ads, Landing Page, Manual, etc)
- Top 8 campanhas por volume
- Filtro por cliente (Admin)

---

### Infraestrutura & Deploy
- Next.js 14 App Router com TypeScript
- Firebase Firestore como banco de dados (Admin SDK server-side)
- Deploy na Vercel via CLI
- Cron job configurado via cron-job.org (a cada 1 minuto)
- Endpoint de cron protegido por CRON_SECRET
- Variáveis de ambiente separadas por ambiente

---

### Correções & Melhorias Técnicas
- Correção de normalização de telefone inconsistente entre serviços
- Centralização da função normalizePhone em lib/normalizePhone.ts
- Correção de query Firestore com limit(50) que perdia leads antigos
- Correção de erro de índice composto no Firestore para queries filtradas
- Migração de leads com status em inglês para português
- Status normalization: "new" → "novo" em todo o sistema
- Remoção de suporte a senha plain-text (legado)
- Follow-ups migrados de setTimeout para jobs persistidos no Firestore

---

## Versões anteriores

| Versão | Período | Descrição |
|--------|---------|-----------|
| v0.9.x | Fev–Mar 2026 | Desenvolvimento ativo — fase de construção |
| v0.1.0 | Fev 2026 | Início do projeto — estrutura base |

---

## Próximas versões (planejado)

| Versão | Funcionalidade principal |
|--------|------------------------|
| v1.1.0 | Relatórios avançados + Google Ads |
| v1.2.0 | SDR IA completo — qualificação autônoma |
| v1.3.0 | Prospecção ativa 24h com ICP configurável |
| v1.4.0 | Geração de proposta em PDF |
| v1.5.0 | Assinatura digital + Cobrança automática (Cora) |
| v1.6.0 | Onboarding automático pós-pagamento |
| v2.0.0 | Integração com ecossistema de agentes de IA |

---

*LeadsOS — Departamento Comercial Autônomo com IA*
*Desenvolvido por Robson Jorge Pereira Silva (Robson Catatal)*
