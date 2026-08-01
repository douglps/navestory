# Runbooks — navestory SaaS

<!-- @spec SPEC-20260716-001 RF-07 RF-08 -->

> Procedimentos operacionais para incidentes e rollback. Este arquivo cobre hoje apenas o
> rollback de deploy (SPEC-20260716-001); outros runbooks (ex: incidente de disponibilidade
> do Supabase) são adicionados conforme surgem, sem esperar um catálogo completo antecipado.

---

## Rollback de deploy

### Quando reverter

- Taxa de erro 5xx acima de 1% nas primeiras 15 minutos após um deploy de produção.
- Alerta crítico no Sentry (ver `specs/devops/SPEC-20260716-002-observabilidade.md`) apontando
  para uma regressão introduzida pelo último deploy.
- Relato de indisponibilidade confirmado manualmente.

### Rollback de `apps/web` (Vercel)

Reverte em menos de 2 minutos porque a Vercel mantém o build anterior pronto — não há rebuild.

1. **Via painel:** Vercel → projeto `navestory-web` → aba _Deployments_ → localizar o último deploy
   de produção saudável → menu _"…"_ → **Promote to Production**.
2. **Via CLI:**
   ```bash
   vercel rollback <url-do-deploy-anterior> --token=$VERCEL_TOKEN
   ```
   A URL do deploy anterior está no histórico da aba _Deployments_ ou no comentário que o bot
   da Vercel deixou no PR correspondente.
3. Confirmar em `https://navestory.app` (ou domínio de produção) que a versão anterior está no ar.

### Rollback de `apps/api` (Railway)

Não existe "instant rollback" automático — o processo é um novo deploy apontando para o commit
anterior, passando pelo mesmo pipeline de CD (`.github/workflows/cd.yml`), incluindo o gate
humano.

1. Identificar a tag ou SHA do último commit saudável em produção (`git log master`).
2. Re-disparar o workflow de CD manualmente para esse SHA/tag via `workflow_dispatch`:
   ```bash
   gh workflow run cd.yml --ref <sha-ou-tag-anterior>
   ```
   Isso roda a cadeia completa (`deploy-api-staging` → `migrate-db` → `deploy-api-prod`) para o
   commit escolhido, sem depender do `workflow_run` do CI — útil justamente porque um rollback
   pode precisar acontecer mesmo se o CI do commit atual (o que está causando o incidente) ainda
   estiver rodando ou tiver sido pulado.
3. O job `migrate-db` roda normalmente antes do restart da API (RF-06). **Migrations são
   forward-only** (Supabase não suporta rollback automático de schema) — se o incidente foi
   causado por uma migration, o rollback de código não desfaz o schema; é necessária uma
   migration de compensação nova, escrita manualmente.
4. O gate humano (`environment: production`) exige aprovação de um reviewer autorizado antes do
   `migrate-db`/`deploy-api-prod` prosseguirem — mesmo em rollback, esse gate não é pulado.

### Após o rollback

- Registrar o incidente (causa, horário, ação tomada) — sem template formal de post-mortem
  definido ainda; usar o histórico do PR/issue correspondente até que uma spec de operações
  formalize isso.
- Se a causa foi uma migration, criar spec/tarefa para a migration de compensação antes de
  tentar o deploy novamente.
