---
id: SPEC-20260804-002
title: "Rótulo Correto do Modo `none` e Preferência de Contexto Padrão por Sessão"
status: approved
date: 2026-08-04
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-CTX-01, R-CTX-02, R-CTX-07, R-CTX-08, R-CTX-09, R-PREF-01]
security: [S1, S2]
camadas: [frontend, backend, database]
---

# SPEC-20260804-002: Rótulo Correto do Modo `none` e Preferência de Contexto Padrão por Sessão

---

## Contexto

O chip de contexto de veículo (`VehicleContextChip`, implementado em
`apps/web/src/components/layout/vehicle-context-chip.tsx`) exibe, quando
`selectionMode === "none"`, o rótulo `"+ selecionar veículo"` (branch `default` de
`getModeLabel` em `apps/web/src/lib/context/use-vehicle-context.ts`, linha 143). Esse
texto comunica uma **tarefa pendente** — como se o usuário precisasse fazer algo antes de
continuar — quando na prática `"none"` é o estado padrão funcional que exibe dados de
**toda a frota**.

Essa discrepância foi identificada em auditoria de UX: o rótulo não reflete a semântica
real do estado, gerando a percepção de que o dashboard está "incompleto" ou aguardando
seleção, quando na verdade já está operando sobre o escopo correto ("toda a frota").

Além disso, não há nenhum mecanismo para que o usuário fixe um contexto padrão entre
sessões. A cada login ou reload, o sistema sempre parte de `selectionMode: "none"` (ainda
que `single` e `group` sobrevivam ao reload via `sessionStorage`, o sessionStorage é
descartado ao fechar a aba — e no login em uma aba nova, o contexto é sempre `none`). Um
gestor de frota que sempre opera sobre um veículo específico precisa reconfigurar o
contexto a cada nova sessão.

---

## Objetivo

1. Corrigir o rótulo do estado `"none"` de "tarefa pendente" para o termo canônico já
   estabelecido pela nomenclatura Em Foco: **"Toda a frota"**.
2. Permitir que o usuário configure um **contexto padrão** (veículo individual, grupo ou
   "todos os veículos") que seja aplicado automaticamente no início de cada sessão — após
   login ou abertura de nova aba — sem exigir reconfiguração manual.

---

## Trade-off documentado: reinterpretar `"none"` vs. introduzir `"all"`

### Opção A — Reinterpretar o rótulo do valor `"none"` existente

Manter `selectionMode: "none"` como o estado de "frota toda", apenas corrigir o texto
exibido no chip e o `aria-label` correspondente. Nenhuma mudança no tipo `SelectionMode`,
no store Zustand, nem na lógica de filtragem de queries.

**Prós:** zero breaking change; corrige o problema com uma única linha em
`getModeLabel`. Todas as guards `selectionMode === "none"` no código existente continuam
válidas.

**Contras:** a palavra `"none"` permanece semanticamente ambígua internamente — ao ler o
código, `selectionMode === "none"` parece um estado vazio/pendente, não um escopo de "toda
a frota".

### Opção B — Adicionar `selectionMode: "all"` explicitamente

Introduzir um sexto valor no tipo `SelectionMode` que representa explicitamente "frota
toda". O valor `"none"` passaria a ser um estado genuinamente transitório
(hidratação/inicialização), e `"all"` seria o estado operacional de escopo amplo.

**Prós:** semântica precisa no código; possibilidade futura de distinguir "usuário nunca
escolheu" de "usuário escolheu ver tudo".

**Contras:** breaking change em todos os `switch/if` sobre `SelectionMode`
espalhados pelo código; exige migração do dado em `sessionStorage`; aumenta a complexidade
da máquina de estados sem ganho funcional imediato para o usuário.

### Decisão: Opção A

A Opção A é suficiente para corrigir o problema real (rótulo enganoso) sem introduzir
risco de regressão. O valor `"none"` no store já representa funcionalmente "toda a frota"
— todos os filtros de queries tratam `selectionMode === "none"` como ausência de filtro,
que é exatamente "toda a frota". A mudança é de comunicação, não de comportamento. A
Opção B pode ser avaliada em uma refatoração futura independente se a ambiguidade do nome
`"none"` se provar um problema real de manutenção.

**A spec registra essa decisão explicitamente. Nenhuma mudança no tipo `SelectionMode`
nem na lógica de store é autorizada por esta spec.**

---

## Histórias de Usuário e Critérios de Aceitação

### US-01: Rótulo correto quando nenhum contexto está ativo

**Como** gestor de frota, **quero** que o chip do header mostre "Toda a frota" quando
nenhum veículo ou grupo está selecionado, **para** entender que estou vendo o escopo
completo, não que preciso completar alguma ação.

- **Dado que** `selectionMode` é `"none"` e o usuário está em qualquer página
  autenticada, **quando** o chip de contexto é renderizado, **então** ele exibe o texto
  "Toda a frota" (não "+ selecionar veículo").
- **Dado que** `selectionMode` é `"none"`, **quando** um leitor de tela lê o chip,
  **então** o `aria-label` declara `"Toda a frota — clique para selecionar um veículo ou
  grupo"` (não "Sem contexto — clique para selecionar veículo").
- **Dado que** o usuário clica no botão × de um contexto `single` ou `group`, **quando**
  o contexto é limpo (`clearAllSelection()`), **então** o chip muda para o rótulo "Toda a
  frota" (não desaparece nem mostra "+ selecionar").

---

### US-02: Configurar contexto padrão nas preferências

**Como** gestor de frota, **quero** definir nas preferências qual contexto o sistema deve
ativar automaticamente ao iniciar uma sessão, **para** não precisar reconfigurar o chip
toda vez que abro o dashboard em uma aba nova.

- **Dado que** o usuário acessa `/settings/preferences`, **quando** a seção "Contexto
  padrão" é exibida, **então** ele vê um seletor com três opções: "Toda a frota" (padrão
  de fábrica), "Veículo específico" e "Grupo específico".
- **Dado que** o usuário escolhe "Veículo específico" e seleciona o veículo "ABC-1234",
  **quando** salva a preferência, **então** a coluna `default_context_type = 'single'` e
  `default_context_id = <uuid do veículo>` são persistidas em `user_preferences`.
- **Dado que** o usuário escolhe "Grupo específico" e seleciona o grupo "Frota Sul",
  **quando** salva a preferência, **então** `default_context_type = 'group'` e
  `default_context_id = <uuid do grupo>` são persistidos.
- **Dado que** o usuário escolhe "Toda a frota", **quando** salva a preferência, **então**
  `default_context_type = 'all'` e `default_context_id = NULL` são persistidos.

---

### US-03: Aplicar contexto padrão no início de sessão

**Como** gestor de frota que configurou um veículo padrão, **quero** que o chip já mostre
esse veículo ao abrir o dashboard em qualquer aba nova, **para** não perder tempo
re-selecionando manualmente.

- **Dado que** `user_preferences.default_context_type = 'single'` e
  `default_context_id = <uuid>`, **quando** o usuário faz login ou abre uma nova aba,
  **então** o store é inicializado com `setActiveVehicle(default_context_id)` após a
  hidratação — o chip exibe o veículo configurado, não "Toda a frota".
- **Dado que** a preferência é `'group'`, **quando** o usuário inicia sessão, **então**
  `setActiveGroup(default_context_id)` é chamado.
- **Dado que** `default_context_type` e `default_context_id` são ambos `null` (ausência
  de preferência), **quando** o usuário inicia sessão, **então** o store permanece em
  `selectionMode: "none"` (aplica R-PREF-01 — default "Toda a frota").
- **Dado que** o contexto padrão aponta para um veículo ou grupo que foi excluído
  (soft-delete), **quando** a aplicação tenta aplicar a preferência, **então** a
  preferência é ignorada silenciosamente (sem erro) e o contexto fica `"none"` — o usuário
  verá "Toda a frota" e poderá reconfigurar (aplica R-CTX-05 — staleness).
- **Dado que** o usuário mudou manualmente o contexto durante a sessão (ex.: selecionou um
  grupo), **quando** o sessionStorage persiste esse contexto para o reload da mesma aba,
  **então** o sessionStorage tem precedência sobre a preferência persistida no banco — a
  preferência do banco só é aplicada quando o sessionStorage está vazio (nova aba / novo
  login).

---

## Requisitos Funcionais

| ID    | Requisito                                                                                                                                                                                                       | Prioridade | História    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------- |
| RF-01 | A função `getModeLabel` em `use-vehicle-context.ts` deve retornar `"Toda a frota"` quando `selectionMode === "none"`, substituindo o rótulo atual `"+ selecionar veículo"`.                                    | Alta       | US-01       |
| RF-02 | A função `getModeAriaLabel` em `use-vehicle-context.ts` deve retornar `"Toda a frota — clique para selecionar um veículo ou grupo"` quando `selectionMode === "none"`.                                         | Alta       | US-01       |
| RF-03 | O botão × do chip deve continuar aparecendo **somente** quando `selectionMode !== "none"` — ao retornar para `"none"` via `clearAllSelection()`, o botão × desaparece e o rótulo "Toda a frota" é exibido.     | Alta       | US-01       |
| RF-04 | A migration de banco deve adicionar duas colunas em `user_preferences`: `default_context_type TEXT CHECK (default_context_type IN ('all', 'single', 'group')) DEFAULT NULL` e `default_context_id UUID DEFAULT NULL`, com constraint de coerência: se `default_context_type IN ('single', 'group')` então `default_context_id IS NOT NULL`; se `default_context_type = 'all'` então `default_context_id IS NULL`. | Alta | US-02 |
| RF-05 | O endpoint `PATCH /preferences` (NestJS `PreferencesModule`) deve aceitar os campos `default_context_type` e `default_context_id` opcionalmente, validados por schema Zod em `packages/validators/src/preferences.schemas.ts`. Regras de validação: `default_context_type` deve ser um dos valores do enum ou `null`; `default_context_id` deve ser UUID v4 ou `null`; coerência entre os dois campos deve ser validada no schema (se `type === 'all'` então `id` deve ser `null` ou ausente).  | Alta | US-02 |
| RF-06 | O endpoint `GET /preferences` deve retornar `default_context_type` e `default_context_id` na resposta.                                                                                                         | Alta       | US-02, US-03 |
| RF-07 | A tela `/settings/preferences` deve exibir uma nova seção "Contexto padrão" com um seletor de tipo (`Toda a frota` / `Veículo específico` / `Grupo específico`). Quando o tipo for `Veículo específico` ou `Grupo específico`, um segundo campo de busca/seleção deve aparecer para escolher a entidade correspondente (lista dos veículos/grupos do usuário, excluídos os soft-deleted).                             | Alta       | US-02       |
| RF-08 | A seção "Contexto padrão" em `/settings/preferences` deve exibir um aviso quando a entidade salva como padrão tiver sido excluída: "O veículo/grupo padrão foi removido. Selecione outro ou escolha 'Toda a frota'." A preferência excluída não deve ser limpa automaticamente — o usuário decide a nova configuração.                                                                                                 | Média      | US-02       |
| RF-09 | No mount do layout autenticado (`apps/web/src/app/(app)/layout.tsx`), após a hidratação do store Zustand (`_hasHydrated === true`) e **somente se** o sessionStorage não tiver contexto salvo (ou seja, `selectionMode === "none"` após a hidratação), a aplicação deve buscar `GET /preferences`, verificar `default_context_type` e chamar `setActiveVehicle()` ou `setActiveGroup()` conforme o tipo configurado. | Alta       | US-03       |
| RF-10 | A aplicação da preferência padrão (RF-09) deve ser silenciosa quando a entidade apontada por `default_context_id` não for encontrada na lista de veículos/grupos ativos do usuário — sem erro, sem toast; contexto permanece `"none"` (aplica R-CTX-05 e R-PREF-01).                                                                                                                                                   | Alta       | US-03       |
| RF-11 | A aplicação da preferência padrão (RF-09) deve ocorrer **apenas uma vez por sessão de aba** — se o usuário mudar manualmente o contexto após a aplicação e depois recarregar a mesma aba (reload), o sessionStorage salvo na aba tem precedência e a preferência do banco não é reaplicada. A preferência do banco só vence quando o sessionStorage está vazio (nova aba, novo login).                                  | Alta       | US-03       |

---

## Requisitos Não-Funcionais

| ID     | Requisito                                                                                                                                                                                      | Métrica de Aceite                                                           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| RNF-01 | A busca de `GET /preferences` para aplicar o contexto padrão (RF-09) deve ser feita em paralelo com outras queries do mount do layout, sem adicionar waterfall serial.                         | DevTools Network: requisição de `/preferences` não bloqueia render inicial  |
| RNF-02 | Se `GET /preferences` falhar (rede ou erro 5xx), a aplicação de contexto padrão deve ser ignorada silenciosamente — o sistema inicia em `"none"` sem toast de erro (aplica R-PREF-01).        | Tela carrega normalmente em cenário offline ou erro de API                  |
| RNF-03 | A migration de banco não deve alterar valores existentes em `user_preferences` nem recalcular colunas existentes — apenas adicionar as duas colunas novas com `DEFAULT NULL`.                  | Migration executada sem lock prolongado; zero linhas afetadas além de ALTER  |
| RNF-04 | O campo `default_context_id` deve ser validado como UUID v4 antes de ser usado em query — nunca trusting client input direto (aplica R-SAN-04).                                               | Schema Zod valida UUID antes de chegar ao service                           |
| RNF-05 | A seção de contexto padrão em `/settings/preferences` deve reutilizar os componentes de seleção de veículo/grupo já existentes (ex.: `VehicleSwitcherContent`) — sem novo combobox ad hoc.    | Zero novos componentes de seleção criados; reaproveitamento do existente    |

---

## Fora de Escopo

- **Alterar o tipo `SelectionMode` no store**: nenhuma mudança no enum `"none" | "single" | "group" | "multi" | "attribute"` — a decisão de manter `"none"` está documentada na seção de trade-off acima.
- **Suporte a `default_context_type = 'multi'` ou `'attribute'`**: modos efêmeros não fazem sentido como padrão persistido por definição (R-CTX-02 — esses modos não persistem entre sessões).
- **Aplicação de contexto padrão em todas as abas já abertas**: a preferência só afeta abas que iniciem sem sessionStorage. Abas já abertas com contexto próprio não são afetadas.
- **Sincronização em tempo real da preferência entre abas**: se o usuário mudar a preferência em uma aba, abas já abertas não são notificadas — apenas a próxima nova aba ou login usará o novo padrão.
- **Ajustes de layout da sidebar** (largura em tablet, iconografia, sticky/3 seções): tratados em `specs/layout-responsivo/SPEC-20260730-002-shell-ux-improvements.md`, não fazem parte desta spec.
- **Notificação ao usuário quando o contexto padrão é um veículo/grupo excluído**: a preferência permanece armazenada; o aviso é passivo na tela de preferências (RF-08), sem toast no login.

---

## Dependências

| Tipo | Referência | Descrição |
| ---- | ---------- | --------- |
| Spec | [SPEC-20260602-001](SPEC-20260602-001-em-foco-contexto-global.md) | Define os 5 modos de contexto, a nomenclatura canônica ("Toda a frota") e R-CTX-01 a R-CTX-06 |
| Spec | [SPEC-20260603-001](SPEC-20260603-001-context-chip-subheader.md) | Implementa o `VehicleContextChip` e `getModeLabel`/`getModeAriaLabel` que serão alterados por RF-01/RF-02; define R-CTX-07 |
| Spec | [SPEC-20260603-004](../preferences/SPEC-20260603-004-user-preferences-migration.md) | Migration base da tabela `user_preferences`; as colunas novas desta spec são adicionadas via migration incremental |
| Spec | [SPEC-20260612-003](../preferences/SPEC-20260612-003-auto-draft-preference.md) | Outra preferência no mesmo `PreferencesModule` — sem conflito de coluna, mas o `PreferencesDto` será estendido |
| Código | `apps/web/src/lib/context/use-vehicle-context.ts` | Contém `getModeLabel` e `getModeAriaLabel` — os dois pontos de mudança de RF-01/RF-02 |
| Código | `apps/web/src/lib/stores/use-dashboard-store.ts` | Store Zustand com `selectionMode` e `setActiveVehicle`/`setActiveGroup` usados na aplicação do padrão (RF-09) |
| Código | `apps/web/src/app/(app)/layout.tsx` | Ponto de mount onde a preferência padrão será lida e aplicada (RF-09) |
| Código | `apps/api/src/modules/preferences/preferences.module.ts` | `PreferencesModule` NestJS a ser estendido com os campos novos (RF-05, RF-06) |
| Código | `packages/validators/src/preferences.schemas.ts` | Schema Zod de preferências a ser estendido (RF-05) |
| Biblioteca | `zustand/persist` | Já em uso; `skipHydration`/`onRehydrateStorage` já implementados — RF-09 depende do evento de hidratação |

---

## Notas Técnicas

### Modelo de colunas propostas em `user_preferences`

```sql
-- Migration incremental (adicionar a migration existente ou criar nova)
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS default_context_type TEXT
    CHECK (default_context_type IN ('all', 'single', 'group'))
    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_context_id UUID
    DEFAULT NULL;

-- Constraint de coerência: type e id são sempre coerentes entre si
ALTER TABLE public.user_preferences
  ADD CONSTRAINT chk_default_context_coherence CHECK (
    (default_context_type IS NULL AND default_context_id IS NULL) OR
    (default_context_type = 'all' AND default_context_id IS NULL) OR
    (default_context_type IN ('single', 'group') AND default_context_id IS NOT NULL)
  );
```

O default `NULL` em ambas as colunas é o estado "sem preferência configurada", tratado
pela aplicação como equivalente a `'all'` (aplica R-PREF-01 — ausência nunca causa erro,
retorna default "toda a frota").

**Por que 2 colunas separadas, não JSONB?**
- Permite constraint de integridade referencial futura se `default_context_id` precisar
  ser FK para `vehicles.id` ou `vehicle_groups.id` — JSONB não suporta FK.
- Permite índice direto em `default_context_type` para queries analíticas futuras.
- Constraint CHECK é declarativa e validada pelo banco, não apenas pelo aplicativo.
- JSONB solto transfere toda a validação de coerência para a camada de aplicação, criando
  superfície de erro maior.

### Lógica de aplicação do contexto padrão (RF-09)

```ts
// apps/web/src/app/(app)/layout.tsx (ou hook dedicado useDefaultContext)
// @spec SPEC-20260804-002 RF-09

useEffect(() => {
  // Só age após hidratação do store (RF-24 de SPEC-20260603-001)
  if (!hasHydrated) return;
  // Se sessionStorage já trouxe um contexto, não sobrescrever
  if (selectionMode !== "none") return;

  // Fetch silencioso — falha é ignorada (RNF-02)
  apiClient<UserPreferences>("/preferences")
    .then((prefs) => {
      if (prefs.default_context_type === "single" && prefs.default_context_id) {
        // Validar que o veículo existe na lista já carregada antes de ativar
        setActiveVehicle(prefs.default_context_id);
      } else if (prefs.default_context_type === "group" && prefs.default_context_id) {
        setActiveGroup(prefs.default_context_id);
      }
      // "all" e null: não há nada a fazer — o store já está em "none"
    })
    .catch(() => {
      // Silencioso — não exibir toast (RNF-02, R-PREF-01)
    });
}, [hasHydrated]); // RF-11: roda apenas uma vez por mount (nova aba)
```

A lógica de staleness (RF-10) é satisfeita implicitamente: se `default_context_id` não
estiver na lista de veículos/grupos retornada por `/vehicles` ou `/vehicle-groups`, a
query do `useVehicleContext` simplesmente não encontrará a entidade (`activeVehicle ===
undefined`) e o chip exibirá `"…"` enquanto carrega — mas `setActiveVehicle()` ainda foi
chamado. Para evitar ativar um contexto stale, a aplicação da preferência deve verificar
se o ID existe na lista de veículos/grupos **antes** de chamar `setActiveVehicle()` (ver
RF-10). Se a lista ainda não estiver disponível (loading), o fetch de preferências pode
ser combinado com o fetch de veículos em `Promise.all`.

### Referência cruzada com `specs/preferences/`

As colunas `default_context_type` e `default_context_id` são de domínio de preferência
de usuário e tocam a tabela `user_preferences`. `specs/preferences/README.md` deve ser
atualizado com referência a esta spec (ver instrução de atualização abaixo).

### Rastreabilidade no código

```ts
// @spec SPEC-20260804-002 RF-01
// @spec SPEC-20260804-002 RF-09
```

```sql
-- @spec SPEC-20260804-002 RF-04
```

---

## Changelog (pós-aprovação)

| Data | O que mudou | Por quê |
| ---- | ----------- | ------- |
|      |             |         |
