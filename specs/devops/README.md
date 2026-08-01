# DevOps — Índice de Specs

Esta pasta agrupa as especificações de infraestrutura de deploy, pipeline de entrega contínua e
observabilidade em produção do projeto navestory.

---

## Specs

| ID                                                        | Título                      | Status   | Camadas                   |
| --------------------------------------------------------- | --------------------------- | -------- | ------------------------- |
| [SPEC-20260716-001](SPEC-20260716-001-cd-deploy.md)       | Deploy Automatizado (CD)    | approved | devops, infra             |
| [SPEC-20260716-002](SPEC-20260716-002-observabilidade.md) | Observabilidade em Produção | draft    | backend, frontend, devops |

---

## Contexto

As práticas de DevOps do navestory são construídas sobre o pipeline de CI já existente
(`.github/workflows/ci.yml`), que cobre lint, type-check, testes unitários com gate de cobertura
88%, testes de integração contra Supabase local, build, secret scanning (gitleaks) e dependency
scanning (pnpm audit).

As specs desta pasta adicionam as camadas que faltam:

- **CD (deploy contínuo):** automatizar a entrega do código aprovado pelo CI até os ambientes de
  staging e produção, com gate humano obrigatório antes de produção para a API.
- **Observabilidade:** error tracking (Sentry), logging estruturado (Pino no NestJS) e health
  check extendido com verificação de dependências externas.

---

## Dependências entre specs

```
ci.yml (existente)
  └── SPEC-20260716-001 (CD — deploy após CI verde)
        └── SPEC-20260716-002 (observabilidade — Sentry requer DSN provisionado no ambiente)
```
