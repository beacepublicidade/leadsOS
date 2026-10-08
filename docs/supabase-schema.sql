-- ============================================================
-- LeadsOS — Supabase Schema
-- Migração Firebase → Supabase
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  profile     TEXT NOT NULL DEFAULT 'vendedor', -- admin, gestor, vendedor
  client_id   TEXT,
  password_hash TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── LEADS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'novo', -- novo, contato, proposta, fechado, perdido
  score         INT DEFAULT 0,
  source        TEXT DEFAULT '', -- manual, meta_ads, google_ads, landing_page, naia
  campaign_name TEXT DEFAULT '',
  campaign_id   TEXT DEFAULT '',
  utm_source    TEXT DEFAULT '',
  utm_medium    TEXT DEFAULT '',
  utm_campaign  TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  client_id     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_client_id ON leads(client_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- ─── CONVERSATIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     TEXT NOT NULL,
  phone       TEXT NOT NULL,
  client_id   TEXT,
  ai_enabled  BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_lead_id ON conversations(lead_id);

-- ─── MESSAGES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT,
  lead_id         TEXT,
  direction       TEXT NOT NULL DEFAULT 'inbound', -- inbound, outbound
  content         TEXT NOT NULL DEFAULT '',
  source          TEXT DEFAULT '', -- user, ai, naia
  msg_id          TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_lead_id ON messages(lead_id);

-- ─── PROPOSALS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     TEXT NOT NULL,
  lead_name   TEXT DEFAULT '',
  client_id   TEXT,
  status      TEXT NOT NULL DEFAULT 'draft', -- draft, sent, awaiting_signature, signed, awaiting_payment, paid
  amount      NUMERIC(12,2) DEFAULT 0,
  pdf_url     TEXT DEFAULT '',
  sign_link   TEXT DEFAULT '',
  autentique_id TEXT DEFAULT '',
  cora_id     TEXT DEFAULT '',
  pix_code    TEXT DEFAULT '',
  boleto_url  TEXT DEFAULT '',
  signed_at   TIMESTAMPTZ,
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── AGENCY CLIENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agency_clients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id       TEXT DEFAULT '',
  name          TEXT NOT NULL,
  cnpj          TEXT DEFAULT '',
  briefing      TEXT DEFAULT '',
  niche         TEXT DEFAULT '',
  responsible   TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'ativo', -- ativo, pausado, encerrado
  monthly_value NUMERIC(12,2) DEFAULT 0,
  start_date    TEXT DEFAULT '',
  contract_id   TEXT DEFAULT '',
  tenant_id     TEXT NOT NULL DEFAULT 'default',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_clients_tenant_id ON agency_clients(tenant_id);

-- ─── AGENCY PROJECTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agency_projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  month       TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'planejamento', -- planejamento, em_andamento, concluido
  responsible TEXT DEFAULT '',
  deadline    TEXT DEFAULT '',
  tenant_id   TEXT NOT NULL DEFAULT 'default',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_projects_client_id ON agency_projects(client_id);

-- ─── AGENCY TASKS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agency_tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  TEXT NOT NULL,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pendente', -- pendente, em_andamento, concluida
  assignee    TEXT DEFAULT '',
  due_date    TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_tasks_project_id ON agency_tasks(project_id);

-- ─── AGENCY DELIVERABLES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS agency_deliverables (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  TEXT NOT NULL,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pendente', -- pendente, em_revisao, aprovado
  file_url    TEXT DEFAULT '',
  approved_at TIMESTAMPTZ,
  approved_by TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── LEGAL TEMPLATES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS legal_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'outros', -- social_media, trafego_pago, branding, consultoria, outros
  content     TEXT NOT NULL DEFAULT '',
  variables   JSONB DEFAULT '[]'::JSONB,
  tenant_id   TEXT NOT NULL DEFAULT 'default',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_templates_tenant_id ON legal_templates(tenant_id);

-- ─── LEGAL CONTRACTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS legal_contracts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      TEXT NOT NULL,
  client_name    TEXT DEFAULT '',
  lead_id        TEXT DEFAULT '',
  template_id    TEXT NOT NULL,
  template_name  TEXT DEFAULT '',
  filled_content TEXT DEFAULT '',
  variables      JSONB DEFAULT '{}'::JSONB,
  status         TEXT NOT NULL DEFAULT 'rascunho', -- rascunho, aguardando_assinatura, assinado, cancelado
  value          NUMERIC(12,2) DEFAULT 0,
  autentique_id  TEXT DEFAULT '',
  sign_link      TEXT DEFAULT '',
  pdf_url        TEXT DEFAULT '',
  signed_at      TIMESTAMPTZ,
  tenant_id      TEXT NOT NULL DEFAULT 'default',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_contracts_tenant_id ON legal_contracts(tenant_id);
CREATE INDEX idx_legal_contracts_client_id ON legal_contracts(client_id);

-- ─── FINANCIAL CHARGES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_charges (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     TEXT NOT NULL,
  client_name   TEXT DEFAULT '',
  description   TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pendente', -- pendente, pago, vencido, cancelado
  payment_type  TEXT NOT NULL DEFAULT 'pix', -- pix, boleto
  cora_id       TEXT DEFAULT '',
  pix_code      TEXT DEFAULT '',
  boleto_url    TEXT DEFAULT '',
  due_date      DATE NOT NULL,
  paid_at       TIMESTAMPTZ,
  nfse_id       TEXT DEFAULT '',
  nfse_status   TEXT DEFAULT '',
  nfse_numero   TEXT DEFAULT '',
  nfse_pdf_url  TEXT DEFAULT '',
  recurrence_id TEXT DEFAULT '',
  tenant_id     TEXT NOT NULL DEFAULT 'default',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_charges_tenant_id ON financial_charges(tenant_id);
CREATE INDEX idx_financial_charges_status ON financial_charges(status);
CREATE INDEX idx_financial_charges_due_date ON financial_charges(due_date);

-- ─── FINANCIAL RECURRENCES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_recurrences (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         TEXT NOT NULL,
  client_name       TEXT DEFAULT '',
  description       TEXT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
  day_of_month      INT NOT NULL DEFAULT 10,
  payment_type      TEXT NOT NULL DEFAULT 'pix',
  status            TEXT NOT NULL DEFAULT 'ativa', -- ativa, pausada, encerrada
  start_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date          DATE,
  next_charge_date  DATE NOT NULL,
  auto_nfse         BOOLEAN DEFAULT false,
  tenant_id         TEXT NOT NULL DEFAULT 'default',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_recurrences_tenant_id ON financial_recurrences(tenant_id);
CREATE INDEX idx_financial_recurrences_next ON financial_recurrences(next_charge_date);

-- ─── FINANCIAL EXPENSES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  category    TEXT NOT NULL DEFAULT 'geral', -- geral, marketing, infraestrutura, pessoal, impostos, ferramentas
  due_date    DATE NOT NULL,
  paid        BOOLEAN DEFAULT false,
  paid_at     TIMESTAMPTZ,
  client_id   TEXT DEFAULT '',
  tenant_id   TEXT NOT NULL DEFAULT 'default',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_expenses_tenant_id ON financial_expenses(tenant_id);

-- ─── NAIA API KEYS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS naia_api_keys (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  key_hash              TEXT NOT NULL UNIQUE,
  tenant_id             TEXT NOT NULL DEFAULT 'default',
  permissions           JSONB DEFAULT '[]'::JSONB,
  rate_limit_per_minute INT DEFAULT 60,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at          TIMESTAMPTZ
);

CREATE INDEX idx_naia_api_keys_hash ON naia_api_keys(key_hash);

-- ============================================================
-- RLS POLICIES — Multi-tenant isolation
-- ============================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_expenses ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so server-side queries work without issue.
-- For client-side queries (if ever used), add policies like:

CREATE POLICY "Tenant isolation - leads" ON leads
  FOR ALL USING (client_id = current_setting('app.tenant_id', true));

CREATE POLICY "Tenant isolation - agency_clients" ON agency_clients
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY "Tenant isolation - legal_templates" ON legal_templates
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY "Tenant isolation - legal_contracts" ON legal_contracts
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY "Tenant isolation - financial_charges" ON financial_charges
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY "Tenant isolation - financial_recurrences" ON financial_recurrences
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY "Tenant isolation - financial_expenses" ON financial_expenses
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));
