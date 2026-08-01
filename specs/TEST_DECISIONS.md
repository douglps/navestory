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
