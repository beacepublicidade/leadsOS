# 📌 CONTEXTO LeadsOS - Sessão Atual

**Data:** 2026-04-14 | **Claude:** Haiku 4.5 | **Status:** Ativo

---

## 🎯 O que está acontecendo

LeadsOS é um **departamento comercial simplificado** que:
- Usa Claude API para agentes SDR (prospecção) + Closer (conversão)
- Roda 24h via WhatsApp com Evolution API (seu servidor em 137.131.180.159)
- Gerencia leads, propostas e pagamentos
- Deploy automático via Vercel (`npx vercel --prod --yes`)

---

## 📁 Estrutura Importante

```
LEADSOS/
├── app/api/              → API routes (webhooks, CRUD)
├── app/dashboard/        → UI do departamento comercial
├── docs/
│   ├── PROJETO.md        → Documentação técnica
│   └── BI-MARKETPLACE/   ← Pacotes de BI/Marketplace
│       ├── Pacotes/
│       │   ├── v1_2026.html
│       │   └── v2_2026.html
│       ├── Mercado/
│       │   └── EUA_2026.html
│       └── Propostas/
│           └── Nichos_2026.html
├── services/            → Lógica (SDR, notificações, integrações)
├── lib/                 → Utilitários (Firebase, auth, phone)
├── types/               → Tipos TypeScript
└── .memória/           ← Você está aqui (contexto por sessão)
```

---

## 🔐 Credenciais Necessárias

```
.credenciais/.env:
├── CLAUDE_API_KEY=sk-ant-...
├── FIREBASE_*=...
├── EVOLUTION_API_URL=http://137.131.180.159:8080
├── EVOLUTION_API_KEY=d2282loffblywf8z95sch
├── EVOLUTION_INSTANCE=beace-comercial
└── VERCEL_OIDC_TOKEN=...
```

---

## 🚀 Deploy Rápido

```bash
cd leadsOS
npm run build
npx vercel --prod --yes
```

---

## 📋 Próximas Tarefas (Preencha conforme avança)

- [ ] Tarefa 1
- [ ] Tarefa 2
- [ ] Deploy?

---

## 📞 Referências

- **Projeto CLAUDE.md:** `../CLAUDE.md`
- **BI/Marketplace:** `/docs/BI-MARKETPLACE/`
- **Credenciais:** `../../SISTEMA-CLOUD/CREDENCIAIS/.env`

**Última atualização:** [Data] - Insira aqui as mudanças
