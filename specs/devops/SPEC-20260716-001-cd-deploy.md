---
id: SPEC-20260716-001
title: "Deploy Automatizado (CD)"
status: approved
date: 2026-07-16
author: Douglas Lopes (lps.doug@protonmail.com)
rules: []
security: [S3]
camadas: [devops, infra]
---

# SPEC-20260716-001 — Deploy Automatizado (CD)

## Contexto

O projeto navestory possui um pipeline de CI funcional (`.github/workflows/ci.yml`) cobrindo lint,
type-check, testes, integração com Supabase local, build, secret scanning e dependency scanning.
No entanto, **não existe nenhum pipeline de entrega contínua (CD)**: após o CI verde, o código
não é enviado a nenhum ambiente automaticamente. Deployments são manuais e não documentados,
o que cria risco operacional e impossibilita rollback rastreável.

O planejamento de deploy já está definido nas seções 3.3/3.4 de
`docs/IMPLEMENTATION_STRATEGY.md` e nas tarefas T0.5 e T0.10. Esta spec formaliza esses
requisitos e detalha como implementá-los sobre o pipeline CI existente.

## Objetivo

Automatizar a entrega de `apps/web` (Vercel) e `apps/api` (staging + gate humano para produção)
de forma que todo código aprovado pelo CI chegue ao ambiente correto sem intervenção manual,
exceto a aprovação explícita para produção da API. Documentar o procedimento de rollback.

## Requisitos Funcionais

| ID    | Requisito                                                                                                                                                                                                                                                                               | Prioridade |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| RF-01 | Cada PR aberto ou atualizado dispara deploy de preview automático de `apps/web` no Vercel; a URL de preview é postada como comentário no PR pelo bot do Vercel                                                                                                                          | Alta       |
| RF-02 | Merge em `master` com todos os jobs de qualidade do CI passando dispara deploy de produção de `apps/web` no Vercel automaticamente, sem aprovação adicional                                                                                                                             | Alta       |
| RF-03 | Merge em `master` dispara deploy de `apps/api` em ambiente de **staging** automaticamente, após os jobs de qualidade passarem                                                                                                                                                           | Alta       |
| RF-04 | Deploy de `apps/api` em **produção** exige aprovação manual no GitHub Actions (environment `production` com `required_reviewers`); o gate humano só aparece após o deploy de staging estar saudável                                                                                     | Alta       |
| RF-05 | Os jobs de deploy (`deploy-web-preview`, `deploy-api-staging`, `deploy-api-prod`) dependem explicitamente dos jobs de qualidade existentes (`lint`, `type-check`, `test`, `build`) — nenhum deploy inicia se qualquer job de qualidade falhar                                           | Alta       |
| RF-06 | Migrations do Supabase são aplicadas via job dedicado (`migrate-db`) no pipeline de deploy de produção, após o gate humano e antes de qualquer restart da API, nunca manualmente em produção sem registro no pipeline                                                                   | Alta       |
| RF-07 | Rollback de `apps/web`: revertido via painel Vercel ("Instant Rollback") ou via CLI `vercel rollback <deployment-url>`; o último deploy bem-sucedido de produção é preservado e pode ser promovido em menos de 2 minutos                                                                | Alta       |
| RF-08 | Rollback de `apps/api`: revertido via re-dispatch do job de deploy de produção apontando para a tag Git anterior; o processo é o mesmo do deploy normal (gate humano + migrate-db idempotente)                                                                                          | Alta       |
| RF-09 | Todos os segredos de produção e staging (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_TOKEN`, etc.) são armazenados como GitHub Secrets scoped ao environment correspondente (`staging`, `production`); nenhum segredo é hardcoded em arquivos de workflow | Alta       |
| RF-10 | Variáveis de ambiente de staging são completamente segregadas das de produção — cada environment GitHub tem seu próprio conjunto de secrets; `SUPABASE_SERVICE_ROLE_KEY` de produção não é acessível por jobs de staging (aplica S3)                                                    | Alta       |
| RF-11 | O job `migrate-db` usa a Supabase CLI (`supabase db push`) com a variável `SUPABASE_DB_PASSWORD` restrita ao environment de produção; falha de migration aborta o deploy antes do restart                                                                                               | Alta       |
| RF-12 | O status do deploy (URL de preview, ambiente de destino, resultado) é reportado como check no PR via GitHub Deployments API                                                                                                                                                             | Média      |

## Requisitos Não-Funcionais

| ID     | Requisito                                     | Métrica de Aceite                                                                            |
| ------ | --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| RNF-01 | Tempo total do pipeline de CD (após CI verde) | Deploy web: ≤ 3 min; deploy API staging: ≤ 5 min                                             |
| RNF-02 | Tempo de rollback de `apps/web` em produção   | ≤ 2 minutos via Vercel Instant Rollback                                                      |
| RNF-03 | Rastreabilidade de deploys                    | Cada deploy associado a um commit SHA e ao PR/merge que o originou                           |
| RNF-04 | Isolamento de segredos por environment        | Segredos de produção inacessíveis a jobs de staging (GitHub Environment Protection Rules)    |
| RNF-05 | Idempotência de migrations                    | `supabase db push` deve ser idempotente; reexecutar em caso de rollback não corrompe o banco |

## Critérios de Aceite

- [ ] CA-01: Um PR aberto contra `master` gera URL de preview do `apps/web` no Vercel e o link é postado como comentário no PR
- [ ] CA-02: Merge em `master` com CI verde faz deploy de `apps/web` em produção no Vercel sem intervenção manual
- [ ] CA-03: Merge em `master` com CI verde faz deploy de `apps/api` em staging automaticamente
- [ ] CA-04: Deploy de `apps/api` em produção não ocorre sem aprovação explícita de pelo menos um revisor autorizado no GitHub
- [ ] CA-05: Nenhum deploy é disparado quando qualquer job de lint, type-check, test ou build falha
- [ ] CA-06: `SUPABASE_SERVICE_ROLE_KEY` de produção não aparece em logs de jobs de staging; nenhum segredo aparece em logs de nenhum job (S3)
- [ ] CA-07: Rollback de `apps/web` pode ser executado em ≤ 2 min via `vercel rollback`
- [ ] CA-08: Rollback de `apps/api` segue o mesmo fluxo de deploy (gate humano + migrate idempotente); o procedimento está documentado em `docs/operations/runbooks.md`
- [ ] CA-09: Migrations são aplicadas via Supabase CLI no pipeline, não manualmente; falha de migration aborta o deploy

## Fora de Escopo

- Não inclui: canary release, blue/green deploy ou feature flags de infraestrutura (escopo futuro)
- Não inclui: deploy de Edge Functions do Supabase (sem spec aprovada para Edge Functions)
- Não inclui: provisionamento do projeto Supabase (já existe — `navestory`)
- Não inclui: estratégia de disaster recovery (coberta em `docs/operations/disaster-recovery.md`, T0.8)
- Não inclui: rollback de migrations (Supabase não suporta rollback automático; estratégia é "migration forward-only" com compensações explícitas)
- Não inclui: alertas de email para falhas de pipeline (T4.1 adiado para Fase 9)

## Dependências

| Tipo              | Referência                 | Descrição                                                                                                          |
| ----------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Arquivo existente | `.github/workflows/ci.yml` | Pipeline de CI base; jobs de CD dependem de seus jobs de qualidade                                                 |
| Serviço externo   | Vercel                     | Hospedagem e deploy de `apps/web`; requer `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` como GitHub Secrets |
| Serviço externo   | Supabase CLI               | `supabase db push` para aplicar migrations em produção                                                             |
| Regra             | S3                         | `SUPABASE_SERVICE_ROLE_KEY` somente no backend; nenhum segredo de produção exposto a jobs de staging               |
| Infra             | GitHub Environments        | `staging` e `production` com Protection Rules e segredos separados                                                 |

## Notas Técnicas

### Estrutura do workflow de CD

O arquivo `.github/workflows/cd.yml` (a criar) deve definir:

```yaml
# Estrutura conceitual — não é código de implementação
on:
  push:
    branches: [master]
  pull_request: # apenas para deploy de preview web

jobs:
  deploy-web-preview: # PR apenas → Vercel preview
  deploy-web-prod: # merge em master → Vercel produção (needs: build do ci.yml)
  deploy-api-staging: # merge em master → staging (needs: build do ci.yml)
  migrate-db: # merge em master → Supabase CLI (needs: deploy-api-staging)
  deploy-api-prod: # merge em master → produção (needs: migrate-db, environment: production)
```

### Gate humano

O job `deploy-api-prod` deve declarar `environment: production`. O environment `production` no
GitHub deve ter `Required reviewers` configurado com pelo menos um aprovador. O deploy só avança
após aprovação explícita — nunca por timeout ou auto-approve.

### Rollback documentado

O procedimento de rollback deve ser documentado em `docs/operations/runbooks.md` (arquivo
referenciado mas ainda vazio — T0.8 do roadmap). Formato mínimo exigido:

- **Web:** `vercel rollback <url-do-deploy-anterior>` ou via painel Vercel → Deployments → Promote
- **API:** re-dispatch de `cd.yml` com input `ref: <tag-anterior>` + gate humano normal
- **Quando reverter:** deploy com erro 5xx > 1% nas primeiras 15 min, ou alerta crítico no Sentry
  (SPEC-20260716-002)

### Consistência com IMPLEMENTATION_STRATEGY.md

Esta spec cobre as tarefas T0.5 (CI/CD pipeline) e T0.10 (DevSecOps — secret scanning já feito,
esta spec fecha a parte de CD) descritas na Seção 5, Fase 0 de `docs/IMPLEMENTATION_STRATEGY.md`.
A decisão de "deploy de produção apenas via merge em master com aprovação manual" (Seção 3.3) é
implementada aqui como gate humano via GitHub Environments, não como processo informal.

## Histórico de Revisões

| Data       | Versão | Mudança                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Autor                                   |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 2026-07-16 | 1.0    | Criação inicial                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Douglas Lopes (lps.doug@protonmail.com) |
| 2026-07-16 | 1.1    | Promovida a `approved` e implementada (`.github/workflows/cd.yml`). Decisões tomadas com o usuário durante a implementação, não previstas pela v1.0: (1) **plataforma da API** — a spec não nomeava onde `apps/api` roda; decidido usar **Railway** (menor fricção, sem exigir Dockerfile, environments nativos de staging/produção); (2) **gate humano em `migrate-db`, não em `deploy-api-prod`** — RF-04 pede `environment: production` no deploy, RF-06 pede o gate _antes_ da migration; para não exigir duas aprovações manuais na mesma run, o `environment: production` foi colocado apenas em `migrate-db` (primeiro job a tocar produção), e `deploy-api-prod` herda a aprovação via `needs`; (3) **estrutura do workflow** — em vez de disparar `cd.yml` diretamente por `push`/`pull_request` duplicando os jobs de qualidade do CI (RF-05), a cadeia de produção usa `workflow_run` após o workflow "CI" concluir com sucesso, evitando duplicar lint/type-check/test/build; a preview de PR (RF-01) dispara direto em `pull_request`, independente do resultado do CI (mesmo padrão da integração nativa Vercel↔GitHub — um preview serve para revisão visual mesmo com CI vermelho); (4) **`workflow_dispatch` adicionado** para satisfazer RF-08 (rollback via redisparo manual para SHA/tag anterior), não estava no esboço conceitual da v1.0. Documentação: `docs/reference/environment-variables.md` (seção "GitHub Secrets — CD", nova) e `docs/operations/runbooks.md` (novo arquivo, RF-07/RF-08). **Nenhuma conta/token real foi provisionada nesta rodada** (Vercel, Railway, GitHub Environments com required reviewers) — decisão explícita do usuário de implementar só o workflow agora; CA-01 a CA-09 permanecem não verificáveis em produção real até essa configuração externa acontecer. |
