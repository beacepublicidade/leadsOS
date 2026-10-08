# LeadsOS — Departamento Comercial Autônomo com IA

> **"Do primeiro contato ao cliente pagante — tudo no automático."**

**Autor:** Robson Jorge Pereira Silva (Robson Catatal)
**Versão:** v1.0.0
**Lançamento previsto:** 23/03/2026
**Status:** Em desenvolvimento ativo

---

## O que é o LeadsOS

O LeadsOS é um **departamento comercial completo, 100% movido por Inteligência Artificial**.

Não é um CRM comum. Não é só um chatbot. É uma estrutura autônoma que prospecta, qualifica, nutre, negocia, fecha, cobra e faz o onboarding do cliente — **sem depender de equipe humana para operar**.

Foi concebido para ser integrado como um módulo de um ecossistema maior de agentes de IA, onde cada departamento da empresa (comercial, financeiro, operacional, suporte) roda de forma autônoma e se comunica com os demais.

---

## O Problema que Resolve

A maioria das empresas perde dinheiro por falha comercial:

- Leads que chegam e ninguém responde rápido
- Follow-ups esquecidos
- Vendedores que não qualificam bem
- Processos manuais que não escalam
- CRMs que ninguém usa direito

O LeadsOS **elimina esse problema na raiz** — substituindo tarefas humanas repetitivas por agentes de IA que trabalham 24 horas, 7 dias por semana, com consistência total e custo marginal zero.

---

## Para Quem Foi Feito

- Empresas que captam leads via anúncios (Meta Ads, Google Ads)
- Negócios que usam WhatsApp como canal principal de vendas
- Agências de marketing que gerenciam múltiplos clientes
- Empreendedores que querem escalar sem aumentar equipe

---

## O Fluxo Comercial Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPARTAMENTO COMERCIAL IA                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. PROSPECÇÃO ATIVA                                             │
│     IA busca empresas por nicho e região (24h/dia)              │
│     Filtra pelo ICP — descarta quem não se encaixa              │
│     Enriquece dados (telefone, site, redes sociais)             │
│                    ↓                                              │
│  2. CAPTURA PASSIVA                                              │
│     Landing Pages personalizadas por cliente                    │
│     Integração Meta Ads + Google Ads                            │
│     UTM tracking completo                                        │
│                    ↓                                              │
│  3. SDR IA — PRIMEIRO CONTATO                                    │
│     Abordagem automática no WhatsApp                            │
│     Qualificação inteligente por perfil de lead                 │
│     Follow-ups automáticos (10min, 24h, 48h)                   │
│                    ↓                                              │
│  4. CLOSER IA — NEGOCIAÇÃO                                       │
│     Apresentação de proposta personalizada                      │
│     Geração de PDF com dados do lead                            │
│     Objeções tratadas por IA                                    │
│                    ↓                                              │
│  5. FECHAMENTO                                                   │
│     Contrato gerado automaticamente                             │
│     Assinatura digital                                           │
│     Cobrança via Pix/Boleto (Cora)                              │
│                    ↓                                              │
│  6. ONBOARDING AUTOMÁTICO                                        │
│     Confirmação de pagamento                                    │
│     Boas-vindas e acesso ao produto                             │
│     Passagem para o depto de operações/suporte                  │
│                    ↓                                              │
│  7. INTEGRAÇÃO COM OUTROS DEPTOS DE IA                          │
│     Handoff via API/Webhook                                      │
│     Dados fluem para financeiro, operacional, suporte           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## O que já está funcionando (v1.0.0)

### Infraestrutura
- ✅ Autenticação segura com JWT + cookies httpOnly
- ✅ Multi-tenant (múltiplos clientes isolados)
- ✅ RBAC completo (Admin, Gestor, Vendedor)
- ✅ Deploy na Vercel com cron jobs automáticos

### Captura de Leads
- ✅ Landing Page pública com white label por cliente
- ✅ Captura completa de UTMs (source, medium, campaign, content, term)
- ✅ Integração Meta Ads via webhook
- ✅ Criação manual de leads no dashboard
- ✅ Leads vinculados ao cliente correto automaticamente

### WhatsApp & Conversas
- ✅ Integração Z-API para envio e recebimento
- ✅ Histórico completo de conversas no dashboard
- ✅ Suporte a áudio, imagem e documentos
- ✅ Human Takeover — vendedor assume a conversa por 30 minutos
- ✅ Retomada de automação com 1 clique
- ✅ Nome do atendente exibido em negrito para o cliente

### Automação & IA
- ✅ Follow-ups automáticos persistidos no Firestore (resistentes a reinicializações)
- ✅ Templates de mensagens por cliente e por trigger de status
- ✅ Sugestão de resposta por IA (Claude)
- ✅ Auto-reply IA ativável por lead
- ✅ Sistema de playbooks por nicho

### CRM & Pipeline
- ✅ Kanban com 5 estágios (Novo, Contato, Proposta, Fechado, Perdido)
- ✅ Visualização em lista e Kanban
- ✅ Score de lead
- ✅ Tempo no estágio com alerta visual
- ✅ Filtros por status, origem e campanha
- ✅ Exportação CSV e JSON (Admin/Gestor)

### Relatórios
- ✅ Total de leads, leads do mês, taxa de conversão
- ✅ SLA médio de primeiro contato
- ✅ Gráfico de leads por dia (30 dias)
- ✅ Funil por status
- ✅ Leads por origem
- ✅ Top campanhas

### Gestão
- ✅ Gerenciamento de clientes com white label (cor da marca)
- ✅ Gerenciamento de usuários com perfis
- ✅ Logs de sistema
- ✅ Migração de dados legados

---

## Roadmap — O que vem a seguir

| Fase | Funcionalidade | Status |
|------|---------------|--------|
| Fase 3 | WhatsApp — melhorias de escala e status de entrega | 🔄 Em andamento |
| Fase 5 | SDR IA completo — qualificação autônoma | 🔄 Parcial |
| Fase 6 | Relatórios avançados | 🔄 Em andamento |
| Fase 7 | Google Ads integration | 🔄 Parcial |
| Fase 8 | Prospecção ativa 24h (scraping + ICP + IA) | 📋 Planejado |
| Fase 10 | Geração de proposta em PDF | 📋 Planejado |
| Fase 10 | Assinatura digital | 📋 Planejado |
| Fase 10 | Cobrança automática (Cora — Pix/Boleto) | 📋 Planejado |
| Fase 10 | Onboarding automático pós-pagamento | 📋 Planejado |
| Fase 11 | IA de análise e recomendações comerciais | 📋 Planejado |
| — | Landing Page personalizável com editor visual | 📋 Planejado |
| — | Código de rastreamento para sites externos | 📋 Planejado |
| — | Testes automatizados | 📋 Final do projeto |

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Banco de dados | Firebase Firestore |
| Autenticação | JWT + bcryptjs + httpOnly cookies |
| WhatsApp | Z-API |
| IA | Anthropic Claude (Haiku + Sonnet) |
| Deploy | Vercel |
| Cron Jobs | cron-job.org |
| Cobrança (futuro) | Cora (Pix + Boleto) |

---

## Visão de Futuro

O LeadsOS é o **módulo comercial** de um ecossistema maior de agentes de IA que está sendo desenvolvido em paralelo. A visão é que cada área da empresa — comercial, financeiro, operacional, suporte, RH — tenha seu próprio agente autônomo, e todos se comuniquem entre si via APIs e webhooks, formando uma **empresa que opera sozinha**.

O departamento comercial (LeadsOS) é o primeiro a ser construído porque é o que **gera caixa** — sem receita, nenhum outro departamento existe.

---

*Desenvolvido por Robson Jorge Pereira Silva (Robson Catatal)*
*Projeto proprietário — todos os direitos reservados*
