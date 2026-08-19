# Decisões de Teste por Funcionalidade — navestory SaaS

> Registro de decisão explícita sobre exigir ou não testes para cada funcionalidade nova.
> Padrão enquanto não há entrada: a funcionalidade **não exige** teste.
> A decisão final de aprovar ou dispensar é sempre de Douglas.
>
> Formato de cada entrada:
>
> ```
> ### <SPEC-ID> — <Título>
> **Status:** pendente | aprovado | dispensado
> **Decisão:** requer testes | não requer testes
> **Justificativa:** <por que sim ou por que não>
> **Escopo (se aprovado):** unit | integration | e2e | combinação
> **Decidido em:** YYYY-MM-DD
> ```

---

### SPEC-20260814-004 — Formulário de Abastecimento: Captura de Comprovante

**Status:** aprovado
**Decisão:** requer testes
**Justificativa:** Regra de segurança e de negócio não-trivial (R-RCP-01 a R-RCP-06, S8): validação de MIME/tamanho no servidor (defesa em profundidade, mesmo já validado pelo `fileFilter` do interceptor), geração server-side de nome de arquivo (nunca o nome original, R-RCP-02), preservação do arquivo após soft-delete (R-RCP-04) e, principalmente, a decisão de arquitetura de geração de thumbnail ASSÍNCRONA (fire-and-forget) tomada nesta rodada — introduz uma máquina de estados (`receipt_thumbnail_status`: not_applicable/pending/completed/failed) cujos branches (PDF nunca gera thumbnail, falha cai em fallback permanente, sucesso atualiza a chave) são exatamente o tipo de lógica que regressão silenciosa quebraria sem teste. Auditoria fire-and-forget (R-MON-01/02) e ausência de `storage_key` completo no campo `changes` também são invariantes de segurança verificáveis.
**Escopo (se aprovado):** unit (`expenses.service.spec.ts` — `uploadReceipt` RF-03/04/05/07/09, `generateReceiptThumbnail` privado RF-05/06, `getReceiptUrls` RF-07/RNF-03; `expenses.controller.spec.ts` — extração de token, 400 sem arquivo); component (React Testing Library: `receipt-field.spec.tsx` — seleção/prévia/remoção/validação RF-01/04/10/12; `receipt-viewer.spec.tsx` — fallback "preparando prévia" vs. thumbnail vs. ícone estático, incluindo `failed`/PDF; integração em `new/page.spec.tsx` e `[id]/page.spec.tsx` — upload pós-criação, falha não-bloqueante com link de retry, indicador em `page.spec.tsx`)
**Decidido em:** 2026-08-14

---

### SPEC-20260814-003 — Formulário de Abastecimento: Autocomplete de Fornecedor

**Status:** aprovado
**Decisão:** requer testes
**Justificativa:** Regra de negócio nova e não-trivial (R-SUGG-01, R-SUGG-02, R-SUGG-03) — dedup por forma normalizada com canônico = primeira ocorrência cronológica, mas ordenação da lista = uso mais recente, mais a combinação de histórico pessoal (RLS user-scoped) com histórico de workspace (bypass de RLS via `SUPABASE_ADMIN_CLIENT`, RNF-02 de segurança). Critério do `.claude/CLAUDE.md` do projeto ("testes obrigatórios para funcionalidades novas com regra de negócio") se aplica diretamente; a superfície de segurança (RNF-02: não vazar histórico de workspace de terceiros sem membership) reforça a decisão.
**Escopo (se aprovado):** unit (service: `expenses.service.spec.ts` — dedup/canônico/ordenação/limites RF-02/RF-03/RF-06/RF-08/RF-09, membership gate RNF-02); component (React Testing Library: `supplier-combobox.spec.tsx` — seleção por clique, texto livre, Esc, grupos pessoal/workspace, fire-and-forget de erro RF-10)
**Decidido em:** 2026-08-14

---

### SPEC-20260814-002 — Formulário de Abastecimento: Cálculo em Tempo Real de Consumo e Preço por Litro

**Status:** aprovado
**Decisão:** requer testes
**Justificativa:** Regra de negócio nova com múltiplos branches determinísticos e verificáveis (R-FUEL-10, R-FUEL-11, R-FUEL-12): gate de exibição de km/L por 4 condições combinadas, limiar de anomalia de 50% sobre média histórica, e o "gap silencioso" que motivou a spec (aviso obrigatório quando o cálculo não ocorre) é exatamente o tipo de branch que regressão silenciosa quebraria sem teste. Lógica extraída para módulo puro (`fuel-realtime-calc.ts`) especificamente para viabilizar testes de unidade rápidos sem montar componente React (RNF-01).
**Escopo (se aprovado):** unit (`fuel-realtime-calc.spec.ts` — RF-01, RF-02, RF-05, RF-06, RF-07, RF-08, formatação RNF-04; `expenses.service.spec.ts` — `getFuelStats` RF-04, R-FUEL-11, RNF-03)
**Decidido em:** 2026-08-14

---

### SPEC-20260813-001 — Header + Dashboard UX v3 (RF-10 a RF-17)

**Status:** aprovado
**Decisão:** requer testes (parcial)
**Justificativa:** RF-11/RF-12 (reordenação de seções no dashboard), RF-14 (min-width de CSS), RF-15 (offset de badge) e RF-17 (migração de ícones) são mudanças de apresentação/posicionamento sem lógica de domínio nova — nenhuma introduz um branch verificável análogo a R-KPI-04 (SPEC-20260804-006), e ficam sem teste dedicado, validadas por revisão visual. RF-10 (`FleetAlertBar`), porém, introduz dois estados visuais distintos e verificáveis (`alerts=undefined` → skeleton com `aria-label`; `alerts=[]` → texto "Frota em dia") — branch determinístico o suficiente para justificar cobertura, e não puro CSS/reposicionamento como o restante do lote. RF-13 está bloqueado (não implementado) e RF-16 não teve alteração de código (análise estática não confirmou o bug).
**Escopo (se aprovado):** unit/component (RF-10: `FleetAlertBar.spec.tsx` — estados `undefined` e `[]`)
**Decidido em:** 2026-08-13 (revisado em 2026-08-14 — auditoria de tech-lead identificou que RF-10 já tinha testes reais escritos, contradizendo a decisão original de "não requer")

---

### SPEC-20260804-005 — Correção de Bug: Membros de Grupo Não Inicializados na Tela de Edição

**Status:** aprovado
**Decisão:** requer testes
**Justificativa:** Bug de perda silenciosa de dado em produção com regra de negócio nova (R-GRP-05): `selectedVehicleIds` nascia vazio e nunca era inicializado, então salvar sem alterar nada apagava toda a composição do grupo (replace-all, R-GRP-02). Critério de "requer testes" do `.claude/CLAUDE.md` do projeto ("Testes obrigatórios para funcionalidades novas com regra de negócio ou impacto em produção") se aplica diretamente. Testes já implementados e registrados na rastreabilidade: `vehicle-groups.service.spec.ts` (RF-01: vehicleIds no findAll) e `vehicle-groups/[id]/page.spec.tsx` (RF-02 a RF-06: inicialização, diff, confirmação de remoção total, cancelamento).
**Escopo (se aprovado):** unit (service: vehicleIds no findAll); component (React Testing Library: inicialização dos checkboxes, confirmação de remoção total, cancelamento não dispara mutação)
**Decidido em:** 2026-08-04

---

### SPEC-20260807-004 — Formulário de Despesa: Hint de Odômetro e Pré-preenchimento de Combustível

**Status:** aprovado
**Decisão:** requer testes (parcial)
**Justificativa:** RF-01 (MAX de odômetro de expenses ∪ maintenances) e RF-05 (retorno de `favorite_fuel_type`) são lógica de negócio nova com ramos verificáveis: (a) maintenances com odômetro maior que expenses deve sobrepor o resultado; (b) `favorite_fuel_type` ausente/null no veículo deve retornar `null`; (c) `favorite_fuel_type` preenchido deve ser devolvido. Esses ramos estão em `getFuelStats` (service, Jest), já testado nesta sessão. RF-02 (hint textual), RF-06 (pre-fill no formulário) e RF-08 (ref `fuelTypeUserEdited`) são lógica de UI/efeito colateral — verificados por revisão de código; custo de teste de componente para `useEffect` de pre-fill é alto e o retorno é baixo dado que o comportamento depende de timing do hook TanStack Query. Testes do frontend (`expenses/new/page.spec.tsx`) já cobrem o submit do formulário; não é necessário CT dedicado ao pre-fill para esta iteração.
**Escopo (aprovado):** unit — `expenses.service.spec.ts` (4 CTs adicionados): RF-01 com maintenances maior, RF-05 sem `favorite_fuel_type`, RF-05 com `favorite_fuel_type`, RF-04 existente atualizado para nova estrutura de retorno.
**Decidido em:** 2026-08-14

---

### SPEC-20260804-006 — Dashboard — Acessibilidade, Correções de Dado e Polimento Visual

**Status:** aprovado
**Decisão:** requer testes (parcial)
**Justificativa:** RF-05 introduz R-KPI-04, uma regra de negócio nova com branch crítico e diretamente verificável: dado amostra < `DELTA_SUPPRESSION_MIN_SAMPLE`, o card `expense_anomalies` deve exibir estado de supressão em vez de valor numérico. A lógica de supressão é função pura e determinística — candidata natural a unit test (mesmo padrão aprovado para R-KPI-02 / delta percentual). Já os demais RFs (Blocos 1, 3, 4 e 5) são correções de render/UX ou realocação de componentes: validados por revisão visual, sem teste dedicado proposto. Confirmado por Douglas, incluindo a proposta original do spec-writer sem estender o escopo a RF-15.
**Escopo (se aprovado):** unit — lógica de supressão de RF-05 (R-KPI-04): dado mock de contagem < `DELTA_SUPPRESSION_MIN_SAMPLE`, verificar que o card retorna estado "indisponível" em vez de valor numérico; dado contagem ≥ limiar, verificar que o valor é exibido.
**Decidido em:** 2026-08-14

---

### SPEC-20260804-002 — Rótulo do Modo `none` e Preferência de Contexto Padrão

**Status:** aprovado
**Decisão:** requer testes (parcial)
**Justificativa:** Toca regras de negócio (R-CTX-01/02/07/08/09, R-PREF-01) e persiste preferência em produção (`user_preferences`), critério de "requer testes" da seção Testes do `.claude/CLAUDE.md` do projeto. Cobertura adicionada: `use-vehicle-context.ts`/`vehicle-context-chip.spec.tsx`/`header.spec.tsx` para o rótulo "Toda a frota" (RF-01, RF-02, RF-03); `vehicle-activator.spec.tsx` para aplicação/staleness/precedência do contexto padrão (RF-09, RF-10, RF-11); `preferences.schemas.spec.ts`, `preferences.service.spec.ts`, `preferences.controller.spec.ts` para validação e persistência (RF-04 a RF-06). RF-07/RF-08 (seção "Contexto padrão" em `/settings/preferences`) cobertos manualmente — sem novo teste de componente dedicado, já que a tela reaproveita `VehicleSwitcherContent` (RNF-05) já testado em outro lugar.
**Escopo (se aprovado):** unit (schemas), integration (service/controller Nest), component (React Testing Library)
**Decidido em:** 2026-08-04

---

### SPEC-20260804-003 — Configurações da Frota — Campos Obrigatórios, Checklist de Onboarding e Conformidade Documental

**Status:** aprovado
**Decisão:** não requer testes por ora
**Justificativa:** Douglas decidiu implementar sem testes automatizados nesta fase, para priorizar velocidade de entrega do MVP de workspace + conformidade. Decisão pode ser reaberta se a feature evoluir ou ganhar risco (ex: quando alertas por e-mail forem implementados na Fase 9).
**Escopo (se aprovado):** —
**Decidido em:** 2026-08-04

---

### SPEC-20260804-004 — Fundação de Workspace (workspace_owner/workspace_member, convite, atribuição de veículo)

**Status:** aprovado
**Decisão:** não requer testes por ora
**Justificativa:** Mesma decisão de Douglas aplicada à fundação de workspace que viabiliza a SPEC-20260804-002 — priorizar velocidade de entrega do MVP. Reabertura recomendada antes de expor a criação de workspace a usuários pagantes reais (quando o gate de plano Frota for implementado).
**Escopo (se aprovado):** —
**Decidido em:** 2026-08-04

---

### SPEC-20260803-001 — Consolidação de Tipos de Resposta da API em packages/validators

**Status:** aprovado
**Decisão:** requer testes (parcial)
**Justificativa (proposta do spec-writer):** a migração em si (RF-01 a RF-03) é verificada pelo próprio type-check (`tsc --noEmit`) — que já é executado no pipeline. Testes adicionais de valor real: (1) um unit test em `packages/validators` que verifica que `vehicleResponseSchema.parse(mockRetorno)` não lança exceção dado o shape real retornado pelo service — trava regressão entre schema e service sem exigir banco. (2) Snap-test do tipo exportado (opcional, baixo custo). Testes de componente/E2E das telas migradas são dispensáveis — a migração não muda comportamento de runtime, só tipos de compilação. RF-04 (varredura de outras entidades) não tem lógica verificável além do type-check.
**Escopo (se aprovado):** unit em `packages/validators` — `vehicleResponseSchema.parse()` contra fixture de shape real do backend (RF-01); verificação de que `ExpenseKpis`/`UpcomingCostItem` estão exportados corretamente (RF-03 — já coberto pelo test existente em `expense.schemas.spec.ts` se existir). Telas do frontend: dispensado (RF-02 e RF-04).
**Decidido em:** 2026-08-04

---

### SPEC-20260801-002 — Analytics Avançado — Correlações, Simulações e Personalização

**Status:** pendente
**Decisão:** requer testes
**Justificativa (proposta do spec-writer):** três blocos de lógica são funções puras determináticas com regras de negócio explícitas — candidatos naturais a unit tests: (1) cálculo de Pearson client-side (RF-01): função de ~10 linhas sobre array de pares numéricos, testável com fixtures de dados conhecidos; (2) guardrail de N mínimo 8 pares (RF-02 / R-ANA-09): branch crítico de negócio — garantir que o coeficiente NÃO é calculado abaixo do limiar é exatamente o tipo de regressão silenciosa que um teste trava; (3) lógica de simulação client-side (RF-04): média móvel com substituição paramétrica de categoria é algoritmo determinístico e verificável com entrada/saída fixas. A nova RPC `expense_category_monthly_series` (RF-03) pode receber integration test de isolamento (`auth.uid()`), mas é opcional nesta fase — depende de decisão de Douglas sobre cobertura de banco. Empty states (RF-06) e personalização de controles (RF-05) são render/UX — validados por revisão visual, sem teste dedicado proposto.
**Escopo (se aprovado):** unit (Pearson client-side RF-01; guardrail N mínimo RF-02; lógica de simulação RF-04); integration opcional (RPC RF-03 — isolamento por `auth.uid()`)
**Decidido em:** pendente

---

### SPEC-20260801-001 — Easter Egg — Heatmap Sazonal e Análise Combinatória

**Status:** pendente
**Decisão:** requer testes (parcial)
**Justificativa (proposta do spec-writer):** dois cálculos client-side têm lógica pura e verificável: (1) cálculo de presença mensal (RF-03) — percentual de meses com ao menos 1 registro sobre janela de 12 meses é função determinística com limiar numérico (R-ANA-08), exatamente o tipo de regra que um unit test trava contra regressão; (2) cálculo de coocorrência para o diagrama (RF-04) — contagem de `month_number` compartilhados por par de categorias é função pura sobre array. A lógica de expiração de 7 dias do ponto pulsante (RF-02) também é verificável com mock de `Date.now()`. A transição visual de desbloqueio (~550ms, ease-out) e o comportamento do drawer embutido ficam dispensados de teste automatizado — são UX/animação, validados por revisão visual e protótipo aprovado. E2e é opcional e baixa prioridade: o easter egg é intencionalmente não anunciado, o que torna fixtures de teste invasivas em relação à mecânica de descoberta.
**Escopo (se aprovado):** unit (cálculo de presença mensal RF-03; cálculo de coocorrência RF-04; lógica de expiração de 7 dias RF-02); e2e opcional (transição de desbloqueio)
**Decidido em:** pendente

---

### SPEC-20260731-007 — Migração de Emoji para Ícones Lucide — KPI Catalog e Feed de Atividades

**Status:** dispensado
**Decisão:** não requer testes
**Justificativa:** Mudança puramente visual — troca de representação de ícone sem alteração de lógica de negócio, estrutura de componente ou contrato de API. O TypeScript valida em tempo de compilação (campo `icon: LucideIcon` rejeita string após a migração) e o build existente (`tsc --noEmit` + `next build`) funciona como teste de sanidade suficiente. Nenhum caso de teste existente verifica o emoji, portanto a migração não quebra nenhuma suite. Confirmado por Douglas.
**Escopo (se aprovado):** N/A
**Decidido em:** 2026-07-31

---

### SPEC-20260730-002 — Melhorias de UX do Shell (Hold-to-Confirm Logout, Avatar Dropdown, Sidebar Persistente, Header Full-Width)

**Status:** aprovado
**Decisão:** requer testes
**Justificativa:** Três das quatro mudanças têm lógica comportamental verificável: (1) hold-to-confirm é uma máquina de estado com timer — testar que `logout()` NÃO é chamado antes de 1000 ms e que É chamado após é exatamente o tipo de comportamento que testes de componente capturam com precisão e sem fragilidade; (2) a persistência do `isSidebarCollapsed` em sessionStorage é uma regra de domínio (R-NAV-06) com padrão já testado em `use-dashboard-store.spec.ts` — a analogia torna o teste trivial de escrever; (3) a remoção de `"navestory-ui-state"` pelo `logout()` é contrato de segurança (evita vazamento de estado entre usuários em dispositivo compartilhado, análogo a S6). A reestruturação do layout (RF-08/RF-09) e o `AvatarDropdown` (RF-04/RF-05) ficam dispensados de teste dedicado, pois são renderização/estrutura JSX — validados por revisão visual e pelo build.
**Escopo (se aprovado):** component (hold-to-confirm: timer, cancelamento, invocação de logout); unit (persistência de `isSidebarCollapsed` em sessionStorage, remoção de `"navestory-ui-state"` no logout)
**Decidido em:** 2026-07-31

---

### SPEC-20260730-002 — US-05 (RF-11..RF-14): Ícone Sempre Visível, Rota Ativa, Remoção de Marca e Largura Calculada

**Status:** aprovado
**Decisão:** requer testes (parcial)
**Justificativa:** RF-12 (destaque de rota ativa) é lógica comportamental verificável — comparação de `pathname` com `item.href` determinando classe/`aria-current` é exatamente o tipo de branch que um teste de componente cobre com precisão. RF-11 (ícone sempre visível) é dispensado de teste dedicado por ser render JSX simples, já coberto indiretamente pelo teste de RF-12 que renderiza a sidebar. RF-13 (remoção do texto "navestory") é uma remoção de elemento, sem lógica — validado por revisão visual/build. RF-14 (largura via `ResizeObserver`/`scrollWidth`) não é testável com significado em `jsdom` (layout real não é computado no ambiente de teste — `scrollWidth` retorna 0); validado por revisão visual manual nos breakpoints, mesmo critério já usado para RF-08/RF-09 desta spec.
**Escopo (se aprovado):** component (RF-12: destaque de rota ativa)
**Decidido em:** 2026-07-31

---

### SPEC-20260730-001 — Score de Saúde de Veículo e Frota

**Status:** aprovado
**Decisão:** requer testes
**Justificativa:** Feature com regra de negócio concreta (pesos e tiers numéricos em R-HS-01 a R-HS-10). Qualquer mudança acidental nos pesos ou na lógica de flag pode passar despercebida sem testes. Os cálculos do algoritmo (RF-01 a RF-06) são funções puras determináticas — é a parte crítica e o que efetivamente trava regressão silenciosa nos pesos/tiers. Decisão de Douglas: escopo restrito a unit por ora; persistência (RF-07), isolamento por usuário (RNF-02) e exibição do semáforo por tier (CA-01, CA-02) ficam sem teste dedicado nesta rodada — podem ser reabertos se a feature ganhar risco.
**Escopo (se aprovado):** unit (lógica de score e flags no service/SQL)
**Decidido em:** 2026-07-31
