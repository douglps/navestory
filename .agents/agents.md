# 🚗 Nave SaaS - AI Engineering Team (Orchestrator)

## Contexto do Projeto
- **Stack**: Next.js 15.2 + React 19 + Supabase + Calm UI v3.0
- **Monorepo**: Turbo + pnpm workspaces
- **Status**: MVP Operacional (Março 2026)
- **Prioridades**: 1) Segurança LGPD/RLS, 2) Acessibilidade WCAG 2.2 AA, 3) Performance Serverless

---

## 🛠️ Skills Library (Orquestração)
Para executar uma habilidade, use o comando: `/skill <nome-da-skill> <parâmetros>`
As definições detalhadas de cada skill estão localizadas na pasta `.agents/`.

| Skill | Arquivo | Categoria | Complexidade |
|-------|---------|-----------|--------------|
| `vehicle-crud-create` | [vehicle-crud-create.md](./vehicle-crud-create.md) | Backend | Baixa |
| `maintenance-alert-edge` | [maintenance-alert-edge.md](./maintenance-alert-edge.md) | Backend | Média |
| `dashboard-metrics-rsc` | [dashboard-metrics-rsc.md](./dashboard-metrics-rsc.md) | Frontend | Baixa |
| `vehicle-card-gamified` | [vehicle-card-gamified.md](./vehicle-card-gamified.md) | Frontend | Alta |
| `mapbox-lazy-skeleton` | [mapbox-lazy-skeleton.md](./mapbox-lazy-skeleton.md) | Frontend | Média |
| `pwa-offline-serwist` | [pwa-offline-serwist.md](./pwa-offline-serwist.md) | DevOps | Média |
| `ia-predictive-maintenance` | [ia-predictive-maintenance.md](./ia-predictive-maintenance.md) | IA/ML | Alta |
| `gestor-frota` | [skills/gestor-frota/SKILL.md](./skills/gestor-frota/SKILL.md) | UX/Product | Média |

---

## 👥 Agentes Especializados

### @nave-architect (Tech Lead)
**Responsabilidade**: Validar arquitetura, RLS policies e decisões de infraestrutura.
**Gatilho**: `/arch-review <feature>`

### @nave-frontend (Calm UI Specialist)
**Responsabilidade**: Componentes UI com Calm UI v3.0 (OKLCH + Anti-Fadiga).
**Gatilho**: `/ui-component <nome> <props>`

### @nave-backend (Supabase + Server Actions)
**Responsabilidade**: Server Actions, Edge Functions, RLS, Validação Zod.
**Gatilho**: `/server-action <nome> <schema>`

### @nave-qa (Security + Accessibility)
**Responsabilidade**: Testes E2E, auditoria OWASP, validação WCAG 2.2 AA.
**Gatilho**: `/audit <caminho> <tipo>`

### @nave-devops (Deploy + Monitoring)
**Responsabilidade**: CI/CD, Vercel, Supabase migrations, monitoring.
**Gatilho**: `/deploy <ambiente> <scope>`

---

## Regras Globais (NÃO NEGOCIÁVEL)

1. **Nunca** bypass RLS no frontend
2. **Sempre** validar com Zod de `@nave/validators`
3. **Sempre** usar cores OKLCH do Calm UI
4. **Sempre** testar acessibilidade antes de merge
5. **Nunca** commit sem `db:generate` atualizado
