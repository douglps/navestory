---
id: SPEC-20260716-003
title: "Testes E2E com Playwright"
status: draft
date: 2026-07-16
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R1, R2, R-CTX-07, R-ODO-01]
security: [S1]
camadas: [frontend, qa]
---

# SPEC-20260716-003 — Testes E2E com Playwright

---

## Contexto

A pirâmide de testes do Nave (`specs/TESTS_SPEC.md`) define Playwright em `apps/web/e2e/` como
camada E2E responsável por 5% da cobertura — os fluxos críticos do ponto de vista do usuário.
Hoje, essa camada não existe: não há pasta `e2e/`, nenhuma dependência do Playwright no
`apps/web/package.json` e nenhum job de E2E em `.github/workflows/ci.yml`.

Os fluxos de maior risco de regressão (autenticação, criação de despesa com avisos de negócio,
troca de contexto de veículo) têm apenas testes unitários com mocks, o que significa que uma
quebra real no fluxo completo (browser → Next.js → NestJS → Supabase) pode passar despercebida
até chegar à produção.

A decisão de usar Playwright como ferramenta E2E é pré-existente e está documentada em
`specs/TESTS_SPEC.md`. Esta spec formaliza os requisitos de configuração, escopo, critérios
de seleção de fluxos e integração com o CI.

---

## Objetivo

Configurar Playwright em `apps/web/e2e/` e definir a suíte mínima de testes E2E que valida
os fluxos críticos do Nave no navegador real, integrando-os ao pipeline de CI antes do deploy.
Não substituir testes unitários ou de integração existentes — complementar a pirâmide onde
mocks não são suficientes.

---

## Requisitos Funcionais

### Instalação e Configuração (RF-CFG)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-CFG-01 | `@playwright/test` adicionado como `devDependency` em `apps/web/package.json`; versão mínima 1.45 | Alta |
| RF-CFG-02 | Arquivo `apps/web/playwright.config.ts` com: `testDir: './e2e'`, `baseURL` lida de variável de ambiente `E2E_BASE_URL` (default `http://localhost:3000`), timeout de 30s por teste, 1 tentativa em CI (`retries: process.env.CI ? 1 : 0` — reduzido de 3 para distinguir falha real de ruído de infra sem mascarar flakiness, ver RNF-02), relatório `html` em `e2e/reports/` | Alta |
| RF-CFG-03 | Browsers configurados: `chromium` (obrigatório), `firefox` e `webkit` opcionais para CI (podem ser omitidos no job inicial para reduzir tempo de pipeline) | Alta |
| RF-CFG-04 | Script `"e2e": "playwright test"` e `"e2e:ui": "playwright test --ui"` adicionados em `apps/web/package.json` | Alta |
| RF-CFG-05 | Pasta `apps/web/e2e/` criada com `fixtures/` (helpers e `test` extendido), `pages/` (Page Objects), `tests/` (specs de teste) | Alta |
| RF-CFG-06 | Arquivo `apps/web/e2e/fixtures/base.ts` exportando `test` e `expect` já configurados com autenticação reutilizável via `storageState` do Playwright | Alta |
| RF-CFG-07 | `apps/web/e2e/.gitignore` ignorando `reports/`, `test-results/`, `playwright-report/` e `auth-state.json` (tokens de sessão capturados em setup) | Alta |
| RF-CFG-08 | Setup global (`globalSetup`) realiza login uma vez e salva o `storageState` em `e2e/auth-state.json`; testes reutilizam a sessão sem repetir o fluxo de login (exceto testes que validam o próprio login, que usam contexto sem estado salvo) | Alta |

### Fluxos E2E Obrigatórios (RF-E2E)

| ID | Fluxo | Regra/CT | Prioridade |
|----|-------|----------|------------|
| RF-E2E-01 | **Autenticação — acesso sem sessão:** navegar para rota privada (ex: `/dashboard`) sem sessão ativa → verificar redirect automático para `/login` | S1, CT-006 | Alta |
| RF-E2E-02 | **Autenticação — login com credenciais válidas:** preencher email/senha de usuário de teste → submeter → verificar que o usuário chega ao `/dashboard` com o header e sidebar renderizados | S1, CT-006 | Alta |
| RF-E2E-03 | **Autenticação — logout:** clicar em logout → verificar redirect para `/login` e que `/dashboard` não é mais acessível sem novo login | S1 | Alta |
| RF-E2E-04 | **Criação de despesa — hard block de odômetro:** criar despesa de combustível com `odometer_km` fora de sequência (menor que o máximo registrado em data anterior/igual) para o veículo de teste → verificar que a operação é rejeitada com erro visível (`role="alert"`) e a despesa não é salva (R-ODO-01 — hard block no fluxo web via `?strict=true`; R1 permanece soft warning apenas fora do fluxo web, ver `specs/RULES.md`) | R-ODO-01, CT-001 | Alta |
| RF-E2E-05 | **Criação de despesa — aviso de duplicata:** criar duas despesas com `vehicle_id`, `category`, `amount` e data idênticos → verificar que na segunda criação o aviso de duplicata é exibido (R2) | R2, CT-002 | Alta |
| RF-E2E-06 | **Troca de contexto de veículo — via chip:** clicar no `VehicleContextChip` no subheader → verificar abertura do Dialog/Sheet de seleção → selecionar veículo diferente → verificar que o chip atualiza para exibir o novo veículo e que o contexto persiste ao navegar entre páginas (R-CTX-07) | R-CTX-07 | Alta |
| RF-E2E-07 | **Troca de contexto de veículo — propagação para formulário:** com veículo A em contexto, abrir `/expenses/new` → verificar que o campo `vehicle_id` está pré-selecionado com veículo A; trocar para veículo B via chip enquanto o formulário está aberto (campo ainda `isInherited`) → verificar que o campo atualiza para veículo B | R-CTX-06, R-CTX-07 | Média |

### Dados de Teste E2E (RF-DATA)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-DATA-01 | Usuário de teste E2E configurado via variáveis de ambiente `E2E_USER_EMAIL` e `E2E_USER_PASSWORD`; credenciais nunca hardcodadas nos arquivos de teste | Alta |
| RF-DATA-02 | Veículo(s) de teste pré-existente(s) no ambiente E2E com pelo menos um registro de odômetro, para viabilizar RF-E2E-04 a RF-E2E-07; identificados via variáveis de ambiente `E2E_TEST_VEHICLE_PLATE` (RF-E2E-04/05), `E2E_VEHICLE_A_PLATE` e `E2E_VEHICLE_B_PLATE` (RF-E2E-06/07); criados via seed ou fixture de setup | Alta |
| RF-DATA-03 | Cada suite isola seu estado: testes que criam despesas (RF-E2E-04, RF-E2E-05) devem usar `afterEach` para remover os registros criados, ou rodar em transação revertida | Alta |

### Integração com CI (RF-CI)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-CI-01 | Novo job `e2e` em `.github/workflows/ci.yml` depende do job `build`; só executa em `push` para `main`/`master` e em PRs com label `e2e` (ou equivalente) | Alta |
| RF-CI-02 | O job instala as dependências com `pnpm --filter @nave/web exec playwright install --with-deps chromium` antes de executar os testes | Alta |
| RF-CI-03 | O job precisa da API NestJS rodando (`apps/api`), do Supabase local (`supabase start`) e do servidor Next.js em modo produção (`pnpm build && pnpm start`) ou preview antes de executar o Playwright | Alta |
| RF-CI-04 | Variáveis de ambiente `E2E_BASE_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_TEST_VEHICLE_PLATE`, `E2E_VEHICLE_A_PLATE` e `E2E_VEHICLE_B_PLATE` provisionadas como GitHub Secrets e passadas ao job de E2E | Alta |
| RF-CI-05 | Artefato de relatório HTML (`e2e/reports/`, conforme `outputFolder` do reporter em RF-CFG-02) publicado como artifact do GitHub Actions em caso de falha para facilitar diagnóstico | Alta |
| RF-CI-06 | Falha em qualquer teste E2E bloqueia o deploy (job `build` não é pré-requisito de deploy enquanto E2E está pendente; na configuração final, o job de deploy deve depender de `e2e`) | Média |

---

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Tempo total da suíte E2E em CI | Máximo 5 minutos para a suíte completa (chromium apenas) |
| RNF-02 | Estabilidade | Nenhum teste flaky: todo teste deve passar de forma determinística em 3 execuções consecutivas; testes com flakiness documentada são desabilitados até correção |
| RNF-03 | Isolamento | Nenhum teste depende do estado deixado por outro; cada `describe` roda de forma independente |
| RNF-04 | Segredos | `auth-state.json` nunca commitado; coberto por `.gitignore` local e pelo `secret-scan` (gitleaks) do CI |

---

## Critérios de Aceite

- [ ] CA-01: Pasta `apps/web/e2e/` existe com estrutura `fixtures/`, `pages/`, `tests/`
- [ ] CA-02: `playwright.config.ts` presente; `pnpm e2e` executa sem erro de configuração em ambiente local com variáveis de ambiente definidas
- [ ] CA-03: RF-E2E-01, RF-E2E-02 e RF-E2E-03 (fluxos de autenticação) passam de forma estável em chromium
- [ ] CA-04: RF-E2E-04 (hard block de odômetro, R-ODO-01) exibe o elemento de alerta esperado na tela e a despesa não é salva
- [ ] CA-05: RF-E2E-05 (aviso de duplicata) exibe o elemento de aviso esperado na tela após submissão da segunda despesa
- [ ] CA-06: RF-E2E-06 (troca de contexto via chip) valida abertura do dialog, seleção e atualização do chip
- [ ] CA-07: Nenhuma credencial ou token aparecem nos arquivos `.ts` dos testes; apenas variáveis de ambiente são usadas
- [ ] CA-08: Job `e2e` aparece em `.github/workflows/ci.yml` sem erros de YAML; o job executa no push para `main`/`master`
- [ ] CA-09: Falha em qualquer teste E2E marca o job como falho no GitHub Actions

---

## Critério de Seleção: E2E vs. Unitário

Esta seção define quando um comportamento merece teste E2E em vez de (ou além de) teste unitário.
O objetivo é evitar duplicação de esforço e manter a pirâmide correta (5% E2E).

**Merece E2E quando:**
- O comportamento só pode ser verificado com browser real (redirect de autenticação, manipulação de `sessionStorage`, comportamento de `Dialog`/`Sheet` em viewport mobile)
- O fluxo atravessa frontend → API → banco e o teste unitário com mock não conseguiria detectar uma regressão de integração real
- A funcionalidade é crítica de negócio e uma regressão chegaria ao usuário sem ser percebida nos testes de camada inferior

**Permanece apenas unitário quando:**
- A lógica é de camada única e isolável (validação Zod, cálculo de km/L, guards NestJS)
- O comportamento já é coberto por teste de integração real contra Supabase local (`apps/api/test/integration/`)
- A UI é cosmética (cores, espaçamentos, animações) — conforme `specs/TESTS_SPEC.md` seção "O que NÃO Testar"

**Relação com os CTs existentes:**
- CT-001 e CT-002 têm testes unitários em `expenses.service.spec.ts` validando a lógica de backend. O E2E RF-E2E-04 valida que o hard block de R-ODO-01 (opt-in via `?strict=true`, exclusivo do fluxo web) chega ao usuário no browser como erro visível; RF-E2E-05 valida que o aviso de duplicata (R2) chega ao usuário — camadas diferentes, não duplicação.
- CT-006 tem teste de integração em `auth.int-spec.ts` validando que a API retorna 401. O E2E (RF-E2E-01 a RF-E2E-03) valida o redirect no browser e a sessão gerenciada pelo middleware SSR — complementar, não duplicado.
- CT-007 (RLS) permanece exclusivamente em `rls.int-spec.ts`; o acesso a dado de outro usuário não merece E2E (impossível simular dois usuários de forma não-flaky em browser sem setup complexo).

---

## Fora de Escopo

- Testes E2E de fluxos de manutenção, multas e grupos de veículos — nenhuma tela está finalizada; adicionados em spec futura quando as telas existirem
- Testes em múltiplos browsers além de chromium na configuração inicial (firefox e webkit podem ser habilitados em revisão posterior)
- Testes de performance (Lighthouse, Web Vitals) — escopo de spec separada
- Testes visuais (snapshot/screenshot diff) — fora da pirâmide atual
- Fila de sincronização offline e comportamentos de Service Worker — cobertos por `SPEC-20260712-001` (PWA), que terá sua própria estratégia de teste

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260524-001 | Autenticação — fluxo de login que RF-E2E-02 replica no browser |
| Spec | SPEC-20260603-001 | Context Chip / Subheader — `VehicleContextChip` referenciado em RF-E2E-06 |
| Spec | SPEC-20260612-001 | Hard block de odômetro no fluxo web (R-ODO-01) — comportamento verificado em RF-E2E-04 |
| Spec | SPEC-20260601-001 | Soft warning de odômetro (R1) — regra de base, superada por R-ODO-01 apenas no fluxo web (ver `specs/RULES.md`) |
| Spec | SPEC-20260601-002 | Detecção de duplicata — lógica de R2 verificada em RF-E2E-05 |
| Spec | SPEC-20260720-002 | Aviso de duplicata na UI — implementa o elemento consumido por RF-E2E-05 |
| Spec | specs/TESTS_SPEC.md | Pirâmide de testes, casos críticos CT-001 a CT-007, convenção de nomenclatura |
| Biblioteca | `@playwright/test` ≥ 1.45 | Framework E2E; instalado em `apps/web` como `devDependency` |
| Infraestrutura | Supabase local (`supabase start`) | Backend de banco de dados para o job de E2E em CI |
| Infraestrutura | GitHub Secrets | `E2E_BASE_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` |

---

## Notas Técnicas

### Page Objects
Usar o padrão Page Object Model (POM) em `apps/web/e2e/pages/`. Cada página ou componente
de alto nível (ex: `LoginPage`, `ExpenseFormPage`, `VehicleContextChipComponent`) tem sua
própria classe com métodos semânticos (`login(email, password)`, `openContextDialog()`,
`selectVehicle(name)`). Isso evita que mudanças no DOM quebrem múltiplos testes ao mesmo tempo.

### Autenticação Reutilizável
O `globalSetup` do Playwright realiza login uma vez antes de toda a suíte e salva
`storageState` (cookies + localStorage) em `e2e/auth-state.json`. Os testes que precisam de
sessão autenticada carregam esse state via `use: { storageState: 'e2e/auth-state.json' }`.
Testes que validam ausência de sessão (RF-E2E-01) usam `test.use({ storageState: undefined })`.

### Ambiente E2E em CI
O job de E2E em CI precisa de três processos rodando simultaneamente:
1. Supabase local (`supabase start`) — banco e auth
2. NestJS API (`pnpm --filter @nave/api start:prod`) — porta 3001
3. Next.js (`pnpm --filter @nave/web start`) — porta 3000

A ordem de startup e a verificação de health check de cada processo devem ser feitas com
`wait-on` (ferramenta CLI) antes de executar `playwright test`. O `playwright.config.ts`
pode configurar `webServer` para automatizar isso.

**Decisão de estratégia (2026-07-20):** o job `e2e` sobe a stack completa (Supabase local +
build + start das apps) a cada execução, em vez de apontar `E2E_BASE_URL` para um ambiente de
staging persistente. Escolha deliberada, não omissão: hoje não existe staging provisionado
para o Nave (ver `important/PENDENCIAS-E-PROCESSOS.md`), e a stack local garante ambiente
hermético (sem dados de execuções concorrentes se cruzando) ao custo de ~10-15 min a mais por
execução do job. Revisitar quando um ambiente de staging existir por outro motivo, ou quando o
tempo do job `e2e` se tornar um problema prático — nesse caso, RNF-01 (máximo 5 min) já não
seria mais atendido pela stack local mesmo sem staging.

### Nomenclatura de Testes
Seguir a convenção de `specs/TESTS_SPEC.md`:
```ts
// Happy path
test('CT-006: redirect para /login ao acessar /dashboard sem sessão')

// Edge case
test('EC-E2E-01: aviso de odômetro exibido mas criação não bloqueada (R1)')

// Regressão
test('REG-E2E-01: chip de contexto atualiza após seleção no dialog (R-CTX-07)')
```

### Relação com testes de integração existentes
Os testes de integração em `apps/api/test/integration/` (ex: `auth.int-spec.ts`, `rls.int-spec.ts`)
testam a API de forma isolada, sem browser. Os testes E2E testam o fluxo completo com browser
real. Não remover nem modificar os testes de integração existentes ao adicionar E2E.

---

## Histórico de Revisões

| Data | Versão | Mudança | Autor |
|------|--------|---------|-------|
| 2026-07-16 | 1.0 | Criação inicial | Douglas Lopes (lps.doug@protonmail.com) |
| 2026-07-20 | 1.1 | RF-E2E-04 corrigido: descrevia o comportamento de R1 (soft warning) para o fluxo web, mas `R-ODO-01` (SPEC-20260612-001) já supersede R1 nesse fluxo com hard block via `?strict=true`. Ajustado texto, regra citada e critério de aceite CA-04 para refletir o comportamento real e testado. Correção pequena — sem mudança de status | Douglas Lopes (lps.doug@protonmail.com) |
| 2026-07-20 | 1.2 | Divergências entre implementação e texto corrigidas: RF-DATA-02 e RF-CI-04 passam a citar `E2E_TEST_VEHICLE_PLATE`, `E2E_VEHICLE_A_PLATE` e `E2E_VEHICLE_B_PLATE` (já usados pelo código e pelo CI, mas ausentes do texto); RF-CI-05 corrigido de `playwright-report/` para `e2e/reports/`, refletindo o `outputFolder` real do reporter (RF-CFG-02) — bug de caminho no artifact do CI também corrigido em `.github/workflows/ci.yml`. Correção pequena — sem mudança de status | Douglas Lopes (lps.doug@protonmail.com) |
| 2026-07-20 | 1.3 | Revisão de auditoria: RF-CFG-02 corrigido para `retries: 1` (era `3`), alinhado ao código após correção de B-03 (sleep fixo removido em `vehicle-context-chip.page.ts`) e à política de zero-flakiness (RNF-02); adicionada nota de "Decisão de estratégia" em Ambiente E2E em CI explicitando a escolha consciente por stack local em vez de staging externo. Correção pequena — sem mudança de status | Douglas Lopes (lps.doug@protonmail.com) |
