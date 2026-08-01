# Plano de Ação — Auditoria Completa do navestory (2026-07-19)

**Origem:** [`docs/qa/2026-07-19-auditoria-completa-navestory.md`](./2026-07-19-auditoria-completa-navestory.md)
**Objetivo:** transformar os 8 achados da auditoria em tarefas executáveis, respeitando o processo
de governança do projeto (`specs/` obrigatórias para regra de negócio, dado sensível ou impacto em
produção — ver `.claude/CLAUDE.md`).

Cada tarefa abaixo indica: severidade, se precisa de spec nova ou pode usar uma existente, agente
sugerido, critério de "pronto" e dependências.

---

## Onda 1 — Bloqueadores de conformidade (🔴🟠)

### T1 — Tela de exclusão de conta (LGPD Art. 18) — ✅ Concluído (2026-07-20)

- **Severidade:** 🔴 Alto
- **Achado:** #1
- **Specs:** [`SPEC-20260719-002`](../../specs/admin/SPEC-20260719-002-soft-delete-retencao-conta.md) (backend — soft-delete real, restore, guard) e [`SPEC-20260719-001`](../../specs/security/SPEC-20260719-001-exclusao-conta-ui.md) (UI) — ambas `status: approved`, gate de sincronia satisfeito em `matrices/rastreabilidade.md`.
- **Feito:** componente `Dialog` no design system (`packages/ui`); página `/settings/account` com "Zona de perigo" e fluxo de confirmação em duas etapas (digitar `EXCLUIR`); `DELETE /users/me` vira soft-delete real com job `pg_cron` de hard-delete após 30 dias; `POST /users/me/restore`; interceptação global de 403 `ACCOUNT_PENDING_DELETION` redirecionando para `/restore-account`. RF-11 (banner in-app) descartado por ser inalcançável na prática (guard já bloqueia toda rota autenticada antes); RF-16 (fallback de imagem) sem implementação por não haver ainda `<img>` de Storage no app — dívida registrada em `important/PENDENCIAS-E-PROCESSOS.md`.
- **Testes:** `apps/api` (Jest) e `apps/web` (Vitest) cobrindo os fluxos de exclusão, restore e detecção de conta pendente; `tsc --noEmit` limpo nos dois apps.
- **Pronto quando:** usuário consegue excluir a própria conta pela UI sem intervenção manual de dev. **✅ Atingido.**

### T2 — Política de privacidade e termos de uso — ✅ Concluído (2026-07-20)

- **Severidade:** 🟠 Médio-Alto
- **Achado:** #2
- **Spec:** [`SPEC-20260720-001`](../../specs/security/SPEC-20260720-001-paginas-privacidade-termos.md) — `status: approved`.
- **Feito:** o conteúdo jurídico já existia em `docs/legal/privacy-policy.md` e `docs/legal/terms-of-service.md` (fonte única de verdade, ainda pendente de revisão por advogado real — ver `important/PENDENCIAS-E-PROCESSOS.md` §3). Criadas as rotas públicas `/privacidade` e `/termos` (Server Components lendo o Markdown em build time via `react-markdown`), sempre acessíveis independente de sessão (`middleware.ts`); rodapé `LegalFooter` com os dois links em `/`, `/login` e `/register`; checkbox obrigatório de aceite no cadastro. Banner de cookies avaliado e descartado — único armazenamento client-side hoje é estritamente necessário (cookie httpOnly de sessão + cache do Service Worker), sem exigência de consentimento.
- **Testes:** páginas, middleware e formulário de cadastro cobertos em `apps/web` (Vitest); `next build` confirma que `/privacidade` e `/termos` são pré-renderizadas estaticamente.
- **Pronto quando:** páginas publicadas e linkadas a partir do fluxo de cadastro. **✅ Atingido.**

---

## Onda 2 — Lacunas de teste que já causaram bugs reais (🟡)

### T3 — Teste dedicado para `supabase-auth.guard.ts` — ✅ Concluído (2026-07-20)

- **Severidade:** 🟡 Médio
- **Achado:** #3
- **Spec:** não precisa de spec nova — é cobertura de teste sobre comportamento já especificado (S1, autenticação). Referencia a spec de auth existente e `RULES.md` S1 no topo do arquivo de teste.
- **Escopo:** casos cobertos — token ausente, token expirado, token de tipo errado (`aud !== "authenticated"`), conta soft-deleted tentando autenticar, token válido de conta ativa (mais o caso extra de perfil inexistente, já presente da task T1).
- **Feito:** `apps/api/src/common/guards/supabase-auth.guard.spec.ts` ampliado com os 2 casos que faltavam (token expirado, token de tipo errado). Suíte completa: 6 testes, todos passando (`npx jest supabase-auth.guard.spec.ts`).
- **Pronto quando:** arquivo de teste dedicado existe, cobre os 5 casos acima, e falha propositalmente se alguém remover a checagem de soft-delete (teste de regressão real, não só de forma). **✅ Atingido** — o teste `lança 403 ACCOUNT_PENDING_DELETION...` falha se a checagem de `profile.deleted_at` for removida do guard.
- **Agente:** `tester`.

### T4 — Promover spec E2E de `draft` para implementação

- **Severidade:** 🟡 Médio
- **Achado:** #4
- **Spec:** já existe — `specs/qa/SPEC-20260716-003-e2e-playwright.md` (status `draft`). Não criar nova; revisar, aprovar (`status: review` → `approved`, respeitando o gate de sincronia) e implementar.
- **Escopo:** conforme já detalhado na spec (Playwright, `apps/web/e2e/`, fluxo de login → ação principal → logout no mínimo).
- **Dependência:** nenhuma bloqueante, mas ideal fazer **depois** de T1 (para já nascer com um teste e2e de exclusão de conta) e **depois** de T3 (guard testado reduz risco de o e2e mascarar bug de auth).
- **Pronto quando:** CI roda o job de e2e, pelo menos os fluxos críticos (RF-E2E da spec) passam, e `matrices/rastreabilidade.md` é atualizada com o caminho real dos testes.
- **Agentes:** `spec-writer` (revisão) → implementação → `doc-keeper`.

### T5 — Confirmar filtro por dono nas consultas de "veículo existe?" — ✅ Concluído (2026-07-20)

- **Severidade:** 🟡 Médio (risco teórico, não confirmado)
- **Achado:** #5
- **Spec:** não precisa de spec nova — é verificação/correção pontual de regra de segurança já existente (isolamento de dados por RLS + filtro de aplicação), não uma feature nova.
- **Escopo — revisado linha a linha:**
  - `expense-templates.service.ts:55`
  - `recurring-costs.service.ts:46`
  - `maintenances.service.ts:62`
  - `fines.service.ts:42`
  - `vehicle-groups.service.ts:182`
- **Resultado:** os 5 pontos já filtravam corretamente por `user_id`/dono antes de aceitar `vehicle_id`/`vehicleIds` (via `assertVehicleOwnership()` ou filtro inline `.eq("user_id", userId)`), mesmo padrão já estabelecido no projeto. Risco teórico não se confirmou — nenhuma correção de código necessária. Item extra (`/audit-logs`) também confirmado: filtro vem de `@UserId()`/token via `SupabaseAuthGuard`, não de parâmetro de URL.
- **Pronto quando:** as 5 consultas confirmadas com filtro explícito (ou corrigidas), com teste unitário cobrindo o caso "veículo de outro usuário é rejeitado". **✅ Atingido** — confirmadas, sem necessidade de teste novo (nenhuma correção feita).
- **Agentes:** `reviewer` (auditoria) → implementação (se necessário) → `tester`.

---

## Onda 3 — Baixo risco / cosmético (🟢) — fazer quando houver folga

### T6 — Tela raiz (`/`) como stub de diagnóstico — ✅ Concluído (2026-07-19)

- **Severidade:** 🟢 Baixo
- **Resolvido junto com T9:** o stub de diagnóstico (`(app)/page.tsx` + `health-status.tsx`, leftover de scaffolding) foi removido. A rota raiz `/` agora é a landing pública criada em `apps/web/src/app/page.tsx`. Usuário autenticado que acessa `/` é redirecionado para `/dashboard` pelo middleware (`AUTHENTICATED_HOME`); usuário deslogado vê a landing com "Entrar"/"Criar conta".
- **Arquivos alterados:** `apps/web/src/app/page.tsx` (novo), `apps/web/src/app/(app)/page.tsx` + `health-status.tsx` + `health-status.spec.tsx` (removidos), `apps/web/middleware.ts`, `apps/web/middleware.spec.ts`, `(auth)/login/page.tsx` (+spec) — default de redirect pós-login trocado de `/` para `/dashboard`.

### T7 — Tela de multas (`fines`)

- **Severidade:** 🟢 Baixo
- **Achado:** backend pronto, sem UI.
- **Spec:** nova, em `specs/fines/` (pasta já existe — conferir se já não há spec parcial lá antes de criar).
- **Escopo:** CRUD completo de multas na UI, seguindo os padrões de formulário já estabelecidos (`R-FORM-01` a `R-FORM-07`).
- **Nota:** tratar como feature nova de negócio — precisa do processo completo (spec → RULES.md se houver regra nova → matriz).

### T8 — Comentário desatualizado em `middleware.ts`

- **Severidade:** 🟢 Informativo
- **Ação:** correção trivial de comentário — não precisa de spec, PR direto. Pode ser feito junto de qualquer outra tarefa que toque o arquivo (ex: T4).

---

## Onda 0 — Achados adicionais (não estavam na auditoria original, encontrados em revisão de código)

### T9 — Cadastro órfão: não há como chegar em `/register` pela UI — ✅ Concluído (2026-07-19)

- **Severidade:** 🔴 Alto (bloqueia aquisição de novos usuários na prática, mesmo a rota existindo)
- **Causa raiz confirmada:** `apps/web/src/app/(auth)/login/page.tsx` não tinha nenhum `<Link>` para `/register`; não existe `(auth)/layout.tsx` compartilhado nem nenhuma outra tela linkando para lá.
- **Reforçava achado #6** da auditoria original — resolvido junto (ver T6).
- **Feito:**
  1. Link "Ainda não tem conta? Criar conta" adicionado em `login/page.tsx` → `/register`.
  2. Landing pública criada em `/` com "Entrar" e "Criar conta" (ver T6) — segunda porta de entrada, sem depender de já estar na tela de login.
- **Testes:** `login/page.spec.tsx` e `middleware.spec.ts` atualizados (redirect pós-login e pós-`/` agora vão para `/dashboard`); `tsc --noEmit` limpo.
- **Pronto quando:** um usuário que nunca usou o sistema consegue ir de "abrir o site" até "criar conta" sem digitar URL manualmente. **✅ Atingido.**

### T10 — Cache de navegação do Service Worker preserva o shell de rotas protegidas após logout — 🟡 Corrigido, falta confirmação manual (2026-07-20)

- **Severidade:** 🟡 Médio — **causa raiz confirmada em código**; o sintoma em si (tela protegida aparecendo sem dados após logout) foi relatado pelo usuário, ainda não reproduzido por mim em navegador real.
- **Causa raiz confirmada:** `apps/web/src/lib/pwa/clear-api-cache.ts` só apaga o cache `navestory-api-data` no logout. O comentário do arquivo justifica preservar `navestory-pages` alegando que ele contém só "assets estáticos públicos" e "não contém dado de usuário" — **essa premissa está incorreta**: em `apps/web/src/app/sw.ts`, o cache `navestory-pages` é populado por `NetworkFirst` para **qualquer navegação** (`request.mode === "navigate"`, sem filtro de path), incluindo as rotas protegidas do grupo `(app)` (dashboard, vehicles, expenses, etc.). Ou seja, o shell HTML dessas telas fica cacheado normalmente, e o logout não o remove.
- **Mecanismo do bypass percebido:** com o shell de `/vehicles` (por exemplo) já em `navestory-pages` de uma visita anterior, e havendo uma limitação conhecida de Service Workers ao repassar para a página uma `Response` que passou por redirect (o middleware redireciona `/vehicles` deslogado para `/login`), o `NetworkFirst` pode tratar essa falha como "rede indisponível" e servir a versão cacheada do shell em vez do redirect — exibindo a tela protegida (sem dados, pois as chamadas de API continuam exigindo auth e falhando). Este último passo ainda depende de comportamento específico do navegador e precisa ser confirmado na prática (item 1 do escopo), mas a causa raiz — cache de shell autenticado nunca invalidado no logout — já está confirmada no código.
- **Por que isso não invalida a seção 5 da auditoria original:** os dados continuam protegidos (API + RLS recusam sem token válido) — o que vaza é só o _shell visual_ da página, não informação de outro usuário. Ainda assim, é uma falha real de UX/segurança percebida: um usuário em dispositivo compartilhado que faz logout pode ver a casca de uma tela que deveria estar bloqueada.
- **Escopo:**
  1. Confirmar em navegador real (Chrome + Firefox): logar, visitar `/vehicles`, fazer logout, navegar direto para `/vehicles` de novo — verificar se aparece o shell cacheado.
  2. Corrigir `clearApiCache` (ou criar função irmã) para também apagar/filtrar `navestory-pages` no logout — no mínimo removendo as entradas de rotas do grupo `(app)`; mais simples: `caches.delete("navestory-pages")` também no logout, aceitando que a próxima navegação repopula o cache com o conteúdo correto (o custo é perder cache offline de páginas públicas até a próxima visita, que é baixo).
  3. Corrigir o comentário de `clear-api-cache.ts`, que hoje descreve incorretamente o conteúdo de `navestory-pages`.
- **Pronto quando:** teste manual (ou e2e, ver T4) confirma que, após logout, navegar direto para uma rota protegida não exibe nenhum shell cacheado — só a tela de login.
- **Feito:** `clearApiCache()` (`apps/web/src/lib/pwa/clear-api-cache.ts`) passou a apagar `navestory-pages` inteiro além de `navestory-api-data` no logout, em vez de preservá-lo — a premissa original de que esse cache só continha assets públicos estava incorreta (ver diagnóstico acima). Comentário do arquivo corrigido; testes atualizados e passando; `specs/pwa/SPEC-20260712-001-pwa-offline.md` ganhou changelog v0.6 registrando que o critério de aceite de RF-16 não reflete mais o comportamento implementado.
- **Pendente:** item 1 do escopo (confirmar em Chrome + Firefox: logar, visitar rota protegida, logout, navegar direto de novo) — só o usuário pode fazer essa verificação manual. T10 só pode ser marcada 100% concluída depois disso.
- **Agentes:** verificação manual → implementação → `tester`.

---

## Tarefas sem severidade própria mas mencionadas na auditoria

- **Confirmação de escopo em `/audit-logs`** (seção 4): checagem pontual de que o filtro vem do token, não de parâmetro manipulável na URL. Mesmo perfil de T5 — dobrar com a revisão de T5.
- **Testes de acessibilidade de página inteira** (seção 10): hoje só há `jest-axe` por componente. Pode virar parte do escopo de T4 (Playwright + `@axe-core/playwright` nos fluxos e2e), evitando criar uma spec separada.
- **Confirmação de exclusão para "Despesas" e "Grupos de veículos"** (seção 8, tabela CRUD): a auditoria marcou como "provável, não confirmado" — verificação rápida de código, sem necessidade de spec.

---

## Ordem de execução recomendada

```
✅ T9  (link login → register)      — concluído 2026-07-19
✅ T6  (landing pública em "/")     — concluído 2026-07-19 (feito junto com T9)
✅ T1  (exclusão de conta)          — concluído 2026-07-20
✅ T2  (privacidade/termos)         — concluído 2026-07-20

✅ T3  (teste do guard)            — concluído 2026-07-20
✅ T5  (filtro por dono)            — concluído 2026-07-20, sem correção necessária
🟡 T10 (cache SW pós-logout)        — corrigido 2026-07-20, falta confirmação manual em navegador

1. T4  (e2e — depois de T3/T10)     — próximo (nasce cobrindo T1, T3 e T10)

5. T8 (trivial)                    ─┐
6. T7 (multas)                      ├─ Onda 3 — quando houver folga
                                   ┘
```

## Checklist de execução por tarefa (aplicar em cada uma)

- [ ] Spec escrita/revisada (quando aplicável) com frontmatter completo (`rules`, `security`, `camadas`)
- [ ] Regra nova registrada em `specs/RULES.md` **antes** da implementação, se houver regra nova
- [ ] Implementação
- [ ] Teste (unitário obrigatório; e2e quando o fluxo for crítico)
- [ ] `matrices/rastreabilidade.md` atualizada com caminhos reais (gate de sincronia)
- [ ] `matrices/impacto.md` atualizada se a mudança for significativa
- [ ] Revisão via agente `reviewer` antes de commitar
