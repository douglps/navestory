# Benchmarking de UX de Mercado — Oportunidades por Fluxo Crítico

> **Propósito:** documento vivo para acompanhar oportunidades de UX identificadas ao comparar os fluxos críticos do navestory com padrões de mercado (Fleetio, Samsara, Geotab, e boas práticas gerais de fleet management SaaS). Diferente de [`user-stories.md`](../user-stories.md) — que mapeia jornadas e gaps funcionais por feature — este documento é o backlog de **oportunidades de UX derivadas de benchmark externo**, atualizado conforme novas frentes forem investigadas.
>
> **Como usar:** cada oportunidade nasce aqui como `🔵 aberta`. Quando virar spec, atualizar o status para `📝 spec criada` com o link. Não implementar direto a partir deste doc — toda oportunidade que avançar precisa de spec própria (ver `specs/README.md`).
>
> **Personas de referência:** Carlos (motorista autônomo) · Ana (gestora de frota pequena) · Roberto (gestor de frota grande) — ver `docs/PRD/`.
>
> **Última atualização:** 2026-08-06

---

## Backlog de Oportunidades (tabela viva)

| ID       | Fluxo               | Oportunidade                                                                                   | Origem do padrão                          | Status       |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------ |
| UXB-001  | Dashboard             | Hierarquia visual entre KPIs "north star" e secundários (hoje todos têm o mesmo peso no grid)    | Fleetio/Samsara — tiered KPI hierarchy     | 🔵 aberta    |
| UXB-002  | Dashboard             | Tratamento de erro visível na página (hoje falha de query fica silenciosa em vários widgets)     | Heurística geral de resiliência de UI      | 🔵 aberta    |
| UXB-003  | Expenses              | Bloqueio de odômetro regressivo só é descoberto **depois** do submit (erro de API), sem hint proativo antes de digitar | Prevenção de erro — validar antes de submeter, não só depois | 🔵 aberta — ver detalhe §2.1 |
| UXB-008  | Expenses              | Sem captura de foto de comprovante no lançamento de despesa                                       | Padrão comum em apps de campo (Fleetio, Gridwise) | 🔵 aberta — ver detalhe §2.1 |
| UXB-004  | Expenses              | Gate de "desabilitado para plano Grátis" ainda não implementado client-side (nota já existe no código, `IMPACTO-040`) | Achado no próprio código, não benchmark   | 🔵 aberta    |
| UXB-005  | Compliance BR         | Fluxo de indicação de condutor para multas (PJ não tem CNH, precisa indicar condutor à autoridade dentro do prazo) — gap confirmado, ver detalhe §3.1 | Regulação brasileira (CTB/CONTRAN), não coberta pelos players US | 🔵 aberta — confirmado, precisa de spec nova |
| UXB-006  | Dashboard/Expenses    | ~~Estado offline explícito~~ — já implementado (`ConnectivityIndicator` no `Header`, RF-13 de `SPEC-20260712-001`), ver detalhe §4.1 | Offline-first — padrão de apps de campo   | ⛔ descartada — já resolvido, hipótese estava errada |
| UXB-007  | Global (RBAC)         | Nenhum hook de permissão/role nos componentes de dashboard/expenses hoje — confirmado, workspace foundation não cobre essas telas, ver detalhe §4.2 | RBAC — roles reais do projeto: `user`/`admin`/`workspace_owner`/`workspace_member` | 🔵 aberta — confirmado, precisa de spec nova |

> Convenção de status: 🔵 aberta · 🟡 em avaliação · 📝 spec criada (link) · ✅ implementada · ⛔ descartada (com motivo)

---

## Metodologia

Pesquisa de padrão de mercado (WebSearch, 2026-08-06) cobrindo: dashboards de fleet management (Fleetio, Samsara, Geotab), UX mobile-first para trabalhadores de campo, arquitetura offline-first para PWA, RBAC/workflow de aprovação, integrações técnicas (API/telemetria/ERP), e compliance específico do Brasil (multas, CNH, CRLV). Comparado contra leitura direta do código atual de `dashboard/page.tsx`, `DashboardKpiGrid.tsx`, `FleetCharts.tsx`, `UpcomingCostsWidget.tsx`, `VehicleHealthCard.tsx`, `VehicleSpotlight.tsx`, `expenses/page.tsx` e `dashboard.service.ts` (via agente Explore, sem alteração de código).

---

## 1. Dashboard

### O que o mercado faz
4 KPIs "north star" grandes no topo (custo/km, utilização, downtime, compliance de PM) + 4-6 métricas de apoio em faixa secundária. Meta: usuário identifica o que precisa de atenção em <10s do login.

### O que o navestory faz hoje
`DashboardKpiGrid` renderiza todos os KPIs ativos (escolhidos via `KpiPicker`, persistidos em preferências) num grid uniforme `grid-cols-2 sm:grid-cols-4` — mesmo tamanho de card para todos. Hierarquia existe só por *seção* (kickers "Alertas"/"Indicadores"/"Frota"/"Em Foco"/"Gráficos"), não por importância do KPI dentro do grid.

Pontos fortes já presentes e alinhados a mercado:
- Status por semáforo já implementado em vários pontos: `VehicleHealthCard` (score 0-100 + badge de documento), `UpcomingCostsWidget` (urgência danger/warning/neutral por proximidade de vencimento), `FleetAlertBar`.
- Personalização parcial: usuário escolhe quais KPIs aparecem (`KpiPicker`), mas não reordena nem define destaque.
- Backend já isola falha por KPI (`Promise.allSettled` em `getFleetKpiCatalog`) — resiliência de dados já resolvida no back, falta refletir no front.

### Oportunidade (UXB-001, UXB-002)
Introduzir um KPI (ou par) "em destaque" visualmente maior no topo do grid, e tratar estado de erro de forma visível na página (hoje, falha de `useQuery` em widgets como `UpcomingCostsWidget` e `FleetCharts` degrada silenciosamente para vazio, sem indicar ao usuário que algo falhou vs. "não há dados").

---

## 2. Despesas (Expenses)

### O que o mercado faz
Formulário de lançamento rápido (poucos cliques, mobile-first), validação de odômetro/valores na borda, cálculo automático de métricas derivadas (ex: preço por litro), captura de foto de comprovante.

### O que o navestory faz hoje
3 KPIs no topo (Total mês, Próximos 30 dias, Total histórico) sem hierarquia entre si. Sistema de urgência por 4 níveis de cor já implementado e documentado no código com justificativa (comentário cita ISO 11064-4 para limitar a 4 níveis — boa prática já aplicada). Loading/erro tratados apenas na aba "Lista"; abas "Próximas" e "Por veículo" não têm tratamento visível.

### 2.1 Form `/expenses/new` — aprofundamento (2026-08-06)

Correção do achado inicial: a hipótese "validação client-side ausente" (UXB-003 original) estava **errada**. O form é maduro e cobre a maior parte do que o mercado recomenda:

**O que já está implementado e alinhado a mercado:**
- Validação de schema (`expense.schemas.ts`, Zod): campos obrigatórios (`vehicle_id`, `category`, `amount`, `occurred_at`), limites de valor (`amount` 0,01–100.000.000), odômetro inteiro 0–9.999.999, strings sanitizadas (`trim`/`normalize`/`maxLength`), odômetro obrigatório quando categoria = combustível (`requireOdometerForFuel`).
- **Odômetro não retrocede** com hard-block real (`?strict=true`, RF-04 de `SPEC-20260612-001`/R-ODO-01): compara contra o maior odômetro anterior e o menor posterior do mesmo veículo por data, rejeita com mensagem específica.
- **Detecção de duplicata** (RF do `ExpenseResponse.duplicate_warning`): ao detectar despesa com mesmos dados, mostra alerta com link para a duplicata em vez de criar silenciosamente.
- **Aviso de data futura** (`future_date_warning`).
- Máscaras numéricas pt-BR dedicadas (`CurrencyInput`/`OdometerInput`, estilo "caixa eletrônico") — evita erro de digitação de separador decimal/milhar, problema comum em forms financeiros no Brasil.
- Cálculo cruzado de combustível (`amount = litros × preço/litro`) com resumo de consistência exibido — reduz erro de conta manual.
- Herança reativa do veículo em foco (contexto global) com indicação visual clara de "herdado" vs. "selecionado manualmente".
- Confirmação ao descartar (`isDirty` + `window.confirm`) antes de sair do form com dados não salvos.
- Templates de despesa recorrente (até 20), reduzindo redigitação para lançamentos repetidos (ex.: mesmo posto, mesma categoria).

**Gaps reais encontrados:**
1. **UXB-003 — validação de odômetro é só reativa.** O bloqueio de odômetro regressivo só aparece **depois** do submit, como erro de API (`fieldError` via `ApiError.message`). Não há hint proativo tipo "Último registrado: 58.420 km" visível *antes* de o usuário digitar — a spec `SPEC-20260612-001` RF-04.3 menciona esse hint (`getOdometerHintAction`) como já implementado em outro momento do projeto, mas não aparece no código atual de `/expenses/new` lido nesta rodada. Efeito prático: Carlos digita o valor errado, só descobre ao tentar salvar, perde o contexto de qual era o valor certo.
2. **UXB-008 — sem captura de foto de comprovante.** Nenhum campo de upload de imagem no form. É um padrão citado tanto pelo mercado internacional (Fleetio, Gridwise) quanto pela pesquisa inicial deste documento (critério de aceite de "Abastecimento" no levantamento genérico: *"permitir foto do comprovante"*). Para o navestory isso também é relevante para compliance (nota fiscal como respaldo de despesa dedutível).

O gate de "desabilitado para plano Grátis" (UXB-004) já estava sinalizado como pendência no próprio código (`IMPACTO-040`), não é achado novo desta rodada, mas permanece no backlog para não se perder.

---

## 3. Compliance Brasil (transversal)

Pesquisas genéricas de mercado (majoritariamente EUA) não cobrem a regra de indicação de condutor — como o veículo de frota é registrado como PJ e PJ não possui CNH, a empresa precisa indicar o condutor responsável à autoridade dentro de prazo legal, sob pena de multa adicional por não indicação (potencialmente mais cara que a infração original). Isso é diferente de só "registrar uma multa" — é um fluxo com prazo e consequência jurídica própria.

### 3.1 Fluxo de indicação de condutor — aprofundamento (2026-08-06)

Gap **confirmado** — não é coberto por outro nome nem já resolvido.

**O que existe hoje:** `specs/fines/SPEC-20260607-001-fines-module.md` e `SPEC-20260722-005-fines-frontend.md`, mais o código (`apps/api/src/modules/fines/`, `packages/validators/src/fine.schemas.ts`, tabela `fines` em `supabase/migrations/20260712171830_core_tables.sql`), cobrem apenas o **registro passivo da multa**: valor, data, veículo, e um campo texto livre `driver_name` (opcional, máx. 255 caracteres, sem validação de CPF/CNH — serve para auditoria interna de "quem estava dirigindo", não para o fluxo formal perante a autoridade). O ciclo de vida modelado é financeiro/administrativo (`fine_status`: `pending → paid|appealing|cancelled`, RF-05), com dois prazos rastreados: `due_date` (vencimento de pagamento) e `appeal_deadline` (prazo de recurso).

**O que falta:** nenhum campo/estado de indicação de condutor (ex: `driver_indicated_at`, `indication_deadline`, `indication_status`), nenhum estado no enum `fine_status` equivalente a "aguardando indicação"/"indicação vencida", nenhuma menção nas specs a "indicação de condutor", CNH ou CTB, e nenhuma tela/RPC que trate desse prazo separado.

**Próximo passo:** exige spec nova (`specs/fines/`), com schema novo (provável sub-entidade `fine_driver_indications` ou campos adicionais na tabela `fines`), estado próprio de prazo e alertas de vencimento — distinto do fluxo de pagamento/recurso já existente.

---

## 4. Offline e RBAC (transversal)

### 4.1 Offline — aprofundamento (2026-08-06)

Hipótese original **estava errada** — o gap já está resolvido, não apenas na camada técnica.

`specs/pwa/SPEC-20260712-001-pwa-offline.md` (approved, v0.5) não cobre só cache/instalabilidade: o RF-13/RF-13.1 (regra R-PWA-07) exige explicitamente um indicador de conectividade tipo *pill* no `Header`, ao lado do `VehicleContextChip`, mostrando "Offline · Atualizado [Hoje/Ontem/DD/MM/AA HH:mm]" com `aria-live="polite"`. Está implementado e integrado:
- `apps/web/src/components/pwa/connectivity-indicator.tsx` — componente `ConnectivityIndicator`.
- `apps/web/src/components/layout/header.tsx` — monta o indicador globalmente (não é um tratamento isolado por widget).
- `apps/web/src/lib/hooks/use-online-status.ts` — hook de `navigator.onLine` + eventos `online`/`offline`.
- Testes: `connectivity-indicator.spec.tsx`, `use-online-status.spec.ts`.

Como o indicador está no `Header`, ele aparece em qualquer tela (dashboard, expenses, etc.), não só nos widgets que a hipótese original questionava. UXB-006 descartada.

### 4.2 RBAC — aprofundamento (2026-08-06)

Gap **confirmado** — o workspace foundation recém-implementado (commit `617a0a6`, 2026-08-04) não cobre dashboard/expenses.

Correção de nomenclatura: `matrices/permissoes.md` (rev. 10) não define roles "Driver/Supervisor/Manager/Admin" como a hipótese original supunha. As roles reais do projeto são: `anonymous`, `user`, `admin` (via `app_metadata.role`, checado por `RolesGuard`/`@Roles()`), e `workspace_owner`/`workspace_member` (agora implementados, não mais "planejado" como a matriz ainda registra na seção Workspaces).

O workspace foundation é RBAC real: migrations (`supabase/migrations/20260804210000_workspace_foundation.sql` + 3 de RLS/fix), tabelas `workspaces`/`workspace_members`/`workspace_invites`/`workspace_vehicle_assignments`, guards no backend (`apps/api/src/modules/workspaces/workspaces.controller.ts`, `@UseGuards(RolesGuard)` + `@Roles("workspace_owner")`) e dashboards distintos no frontend (`apps/web/src/app/workspace/page.tsx` renderiza `workspace-owner-dashboard.tsx` ou `workspace-member-dashboard.tsx` conforme o papel).

Mas esse RBAC está isolado na rota `/workspace` (convites, membros, veículos atribuídos). Em `apps/web/src/app/(app)/dashboard/` e `apps/web/src/app/(app)/expenses/`, as únicas ocorrências de `role` encontradas são atributos ARIA (`role="status"`, `role="group"` etc.) — nenhuma checagem de autorização real. Essas telas continuam isoladas apenas por `user_id = auth.uid()`, sem diferenciação entre `workspace_owner` e `workspace_member`: qualquer usuário autenticado vê os mesmos componentes e dados.

**Próximo passo:** exige decisão de produto (o que um `workspace_member` deveria ver de diferente em dashboard/expenses vs. um `workspace_owner`?) antes de virar spec — não é só um gap técnico, é escopo de comportamento ainda não definido. Atualizar `matrices/permissoes.md` para refletir que `workspace_owner`/`workspace_member` já saíram de "planejado" faz parte do fechamento dessa investigação, independente da spec nova.

---

## Changelog

- **2026-08-06** — Criação do documento. Primeira rodada de benchmarking (mercado geral + Brasil) comparada contra Dashboard e Expenses. 7 oportunidades abertas (UXB-001 a UXB-007).
- **2026-08-06** — Aprofundamento do form `/expenses/new` (§2.1). Corrige achado inicial errado (UXB-003 "validação ausente" — na verdade o form é maduro: schema Zod completo, hard-block de odômetro regressivo, detecção de duplicata, máscaras pt-BR, cálculo cruzado de combustível). UXB-003 reformulado para o gap real (hint de odômetro só reativo, não proativo). Nova oportunidade UXB-008 (sem captura de foto de comprovante).
- **2026-08-06** — Aprofundamento das 3 frentes transversais (§3.1, §4.1, §4.2). UXB-005 (indicação de condutor) confirmado como gap real, nenhuma spec/campo cobre hoje — precisa de spec nova. UXB-006 (offline) **descartada**: hipótese estava errada, `SPEC-20260712-001` RF-13 já formaliza `ConnectivityIndicator` no `Header`, implementado e testado. UXB-007 (RBAC) confirmado como gap real e corrigido de nomenclatura (roles reais são `user`/`admin`/`workspace_owner`/`workspace_member`, não Driver/Supervisor/Manager); workspace foundation (commit `617a0a6`) implementa RBAC de verdade mas só na rota `/workspace`, não em dashboard/expenses — decisão de produto pendente antes de virar spec.
