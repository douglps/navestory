# Decisões de Teste por Funcionalidade — Nave SaaS

> Registro de decisão explícita sobre exigir ou não testes para cada funcionalidade nova.
> Padrão enquanto não há entrada: a funcionalidade **não exige** teste.
> A decisão final de aprovar ou dispensar é sempre de Douglas.
>
> Formato de cada entrada:
> ```
> ### <SPEC-ID> — <Título>
> **Status:** pendente | aprovado | dispensado
> **Decisão:** requer testes | não requer testes
> **Justificativa:** <por que sim ou por que não>
> **Escopo (se aprovado):** unit | integration | e2e | combinação
> **Decidido em:** YYYY-MM-DD
> ```

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
**Justificativa:** Três das quatro mudanças têm lógica comportamental verificável: (1) hold-to-confirm é uma máquina de estado com timer — testar que `logout()` NÃO é chamado antes de 1000 ms e que É chamado após é exatamente o tipo de comportamento que testes de componente capturam com precisão e sem fragilidade; (2) a persistência do `isSidebarCollapsed` em sessionStorage é uma regra de domínio (R-NAV-06) com padrão já testado em `use-dashboard-store.spec.ts` — a analogia torna o teste trivial de escrever; (3) a remoção de `"nave-ui-state"` pelo `logout()` é contrato de segurança (evita vazamento de estado entre usuários em dispositivo compartilhado, análogo a S6). A reestruturação do layout (RF-08/RF-09) e o `AvatarDropdown` (RF-04/RF-05) ficam dispensados de teste dedicado, pois são renderização/estrutura JSX — validados por revisão visual e pelo build.
**Escopo (se aprovado):** component (hold-to-confirm: timer, cancelamento, invocação de logout); unit (persistência de `isSidebarCollapsed` em sessionStorage, remoção de `"nave-ui-state"` no logout)
**Decidido em:** 2026-07-31

---

### SPEC-20260730-001 — Score de Saúde de Veículo e Frota

**Status:** aprovado
**Decisão:** requer testes
**Justificativa:** Feature com regra de negócio concreta (pesos e tiers numéricos em R-HS-01 a R-HS-10). Qualquer mudança acidental nos pesos ou na lógica de flag pode passar despercebida sem testes. Os cálculos do algoritmo (RF-01 a RF-06) são funções puras determináticas — é a parte crítica e o que efetivamente trava regressão silenciosa nos pesos/tiers. Decisão de Douglas: escopo restrito a unit por ora; persistência (RF-07), isolamento por usuário (RNF-02) e exibição do semáforo por tier (CA-01, CA-02) ficam sem teste dedicado nesta rodada — podem ser reabertos se a feature ganhar risco.
**Escopo (se aprovado):** unit (lógica de score e flags no service/SQL)
**Decidido em:** 2026-07-31
