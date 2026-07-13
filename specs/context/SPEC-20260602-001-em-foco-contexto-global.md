---
id: SPEC-20260602-001
title: "Sistema Em Foco — Contexto de Veículo Global"
status: approved
date: 2026-06-02
author: douglps
rules: [R5, R-CTX-01, R-CTX-02, R-CTX-03, R-CTX-04, R-CTX-05, R-CTX-06]
security: [S1, S2]
---

# SPEC-20260602-001: Sistema Em Foco — Contexto de Veículo Global

**Status:** Aprovado
**Criada em:** 2026-06-02
**Atualizada em:** 2026-06-02
**Autor:** douglps
**Revisores:** —

---

## Contexto

O Nave SaaS gerencia frotas com múltiplos veículos por usuário. O store Zustand já persiste `activeVehicleId` em localStorage, mas não há sinalização visual global de qual veículo está "em foco". O componente `FleetAside` (painel direito) exibe o veículo ativo somente no dashboard — em páginas como despesas, manutenção e relatórios esse contexto desaparece. Formulários transacionais (nova despesa, nova manutenção) possuem dropdown de veículo que ignora o `activeVehicleId` do store.

O resultado prático são erros do tipo "lancei a despesa no veículo errado" e retrabalho de troca de contexto a cada mudança de página.

### Os 5 modos de contexto

O store já suporta os cinco estados abaixo. Esta spec os formaliza e define o comportamento esperado em toda a aplicação.

| Modo | Campos no store | Persiste |
|------|-----------------|----------|
| `single` | `activeVehicleId` + `selectionMode: 'single'` | Sim — localStorage |
| `group` | `activeGroupId` + `selectionMode: 'group'` | Sim — localStorage |
| `multi` | `multiSelectedIds` + `selectionMode: 'multi'` | Não — somente sessão |
| `attribute` | `attributeFilter` + `selectionMode: 'attribute'` | Não — somente sessão |
| `none` | todos os campos nulos + `selectionMode: 'single'` | — |

### Nomenclatura canônica na UI

Os termos abaixo são contratos de UX. Nenhum componente deve usar variações.

| Conceito | Termo correto | Termos proibidos |
|----------|--------------|-----------------|
| Contexto ativo | **Em foco** | "Selecionado", "Contexto atual" |
| Ausência de contexto | **Toda a frota** | "Nenhum", "Limpar" |
| Ação de mudar contexto | **Trocar** | "Alterar", "Mudar contexto" |
| Modo `multi` | **Seleção personalizada** | "Multi-select" |
| Modo `attribute` | **Filtro de frota** | "Filtro ativo" |
| Ação de limpar | **Ver toda a frota** | "Limpar seleção" |

---

## Objetivo

1. Tornar o contexto de veículo/grupo/seleção visível de forma persistente em toda a aplicação via slot no `Sidebar`.
2. Sincronizar formulários transacionais com o contexto ativo, respeitando os modos coletivos (`group`, `multi`, `attribute`) que não propagam `vehicle_id` automaticamente.
3. Definir o comportamento de cada feature/página para cada um dos cinco modos de contexto.
4. Eliminar a inconsistência onde o usuário muda de página e perde a referência de qual veículo está operando.

---

## Requisitos Funcionais

| ID | Requisito | Prioridade |
|----|-----------|-----------|
| RF-01 | O `Sidebar` deve exibir um slot "Em Foco" fixo, posicionado entre o cabeçalho e os itens de navegação, visível em todas as páginas autenticadas. | Must |
| RF-02 | O slot deve refletir o modo de contexto ativo (`none`, `single`, `group`, `multi`, `attribute`) com visual diferenciado conforme tabela de estados. | Must |
| RF-03 | No modo `single`, o slot exibe placa, modelo e ícone correspondente ao tipo de veículo. No modo `group`, exibe o nome do grupo e contagem de membros. No modo `multi`, exibe contagem de veículos. No modo `attribute`, exibe o atributo e valor filtrado. No modo `none`, exibe convite à seleção com borda tracejada. | Must |
| RF-04 | No sidebar recolhido (collapsed), o slot exibe apenas o ícone do modo ativo com um dot colorido. Um tooltip exibe os detalhes completos ao passar o cursor. | Must |
| RF-05 | O slot deve conter o botão "Trocar" (ação ghost) que abre o seletor de veículo/grupo. | Must |
| RF-06 | O slot deve conter o botão "×" para limpar o contexto e retornar ao modo `none` ("Ver toda a frota"). | Must |
| RF-07 | Formulários de nova despesa e nova manutenção devem capturar o contexto ativo no momento do mount e pré-selecionar o campo `vehicle_id` somente quando o modo for `single`. | Must |
| RF-08 | Quando o modo for `single`, o campo `vehicle_id` no formulário deve exibir o ícone ↩ (herança) com fundo âmbar claro e borda âmbar, distinguindo herança de contexto de seleção manual. | Must |
| RF-09 | Quando o modo for `group`, o formulário deve exibir o campo `vehicle_id` vazio com dica contextual informando o grupo em foco e lista pré-filtrada pelos membros do grupo. | Must |
| RF-10 | Quando o modo for `multi`, o formulário deve exibir o campo `vehicle_id` vazio com dica "N veículos selecionados — qual o destino?" e os N veículos como atalhos de seleção rápida. | Should |
| RF-11 | Quando o modo for `attribute`, o formulário deve exibir o campo `vehicle_id` vazio com dropdown pré-filtrado pelo atributo ativo. | Should |
| RF-12 | Quando o modo for `none`, o formulário deve exibir o campo `vehicle_id` vazio e obrigatório, com os 3 a 5 veículos acessados mais recentemente como atalhos. | Must |
| RF-13 | Quando o usuário seleciona manualmente o `vehicle_id` em um formulário (independentemente do modo), o ícone muda para ✓ e o visual retorna ao fundo neutro e borda padrão. | Must |
| RF-14 | Mudanças no contexto global enquanto um formulário está aberto não devem redefinir o campo `vehicle_id` no formulário. Um toast não-obstrutivo deve informar a mudança com ação opcional "Atualizar campo". | Must |
| RF-15 | O componente `VehicleActivator` é o único responsável por sincronizar URL searchParams com o store Zustand. Nenhum outro componente deve realizar essa ponte. | Must |
| RF-16 | O `FleetAside`, ao carregar, deve detectar se o `activeVehicleId` ou `activeGroupId` em store aponta para uma entidade excluída (soft-delete). Nesse caso, deve chamar `clearAllSelection()` e exibir toast informativo ao usuário. | Must |
| RF-17 | O contexto deve influenciar a filtragem de dados em: Dashboard KPIs, Dashboard Spotlight, lista de despesas, lista de manutenções e geração de relatórios, conforme tabela de semântica por feature. | Must |
| RF-17.1 | O `ContextFilterSync` (implementação de `VehicleActivator` para sincronia store → URL) deve reagir exclusivamente a mudanças nos valores do store Zustand (`activeVehicleId`, `activeGroupId`, `multiSelectedIds`, `selectionMode`). Mudanças em `searchParams` originadas por filtros de página (ex: `ExpenseFilters`, `MaintenanceStatusFilter`) **não devem** disparar a re-sincronização. Isso garante que filtros locais por página coexistam com o contexto global sem conflito. | Must |
| RF-18 | A ficha individual do veículo (`/vehicles/[id]`) e as páginas de Configurações/Preferências devem ignorar completamente o contexto ativo. | Must |
| RF-19 | O logout deve limpar todos os campos de contexto no store (incluindo `multi` e `attribute`). | Must |

---

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | O slot "Em Foco" não deve causar reflow ou layout shift perceptível ao navegar entre páginas. | CLS (Cumulative Layout Shift) = 0 para o slot |
| RNF-02 | A leitura do contexto do store deve ser síncrona — nenhuma chamada de API é feita só para exibir o slot. | Slot renderiza sem waterfall de rede |
| RNF-03 | A detecção de staleness (veículo/grupo excluído) no `FleetAside` deve reutilizar o fetch de listagem já existente, sem request adicional. | 0 requests extras exclusivos para validação de staleness |
| RNF-04 | O toast informativo de mudança de contexto com formulário aberto deve ser não-obstrutivo (não bloqueia interação). | Duração máxima de 5 segundos; descartável pelo usuário |
| RNF-05 | Os termos canônicos da nomenclatura ("Em foco", "Toda a frota", "Trocar", "Ver toda a frota") não devem estar hardcoded em múltiplos arquivos — devem ser centralizados em um objeto de constantes. | Grep no codebase encontra cada string exata em no máximo 1 arquivo de constantes + componentes de renderização |
| RNF-06 | O contexto `single` e `group` devem sobreviver ao reload da página (localStorage). Os modos `multi` e `attribute` devem ser perdidos após reload (somente sessão). | Verificado por teste E2E de ciclo de vida |

---

## Critérios de Aceite

- [ ] O slot "Em Foco" aparece no sidebar em todas as páginas autenticadas, nos modos expandido e recolhido.
- [ ] Cada um dos 5 modos de contexto exibe visual distinto conforme tabela de estados (fundo, borda, estilo de borda, badge, ícone).
- [ ] Sólido = permanente (`single`, `group`); tracejado = temporário (`multi`, `attribute`, `none`).
- [ ] Recarregar a página mantém o contexto `single` e `group`; limpa `multi` e `attribute`.
- [ ] Logout limpa todos os contextos.
- [ ] Formulário de nova despesa aberto com `selectionMode: 'single'` pré-seleciona o veículo ativo com ícone ↩ e visual âmbar.
- [ ] Formulário de nova despesa aberto com `selectionMode: 'group'` exibe campo vazio com dica de grupo e lista filtrada pelos membros.
- [ ] Formulário de nova despesa aberto com `selectionMode: 'none'` exibe campo vazio com atalhos dos últimos veículos acessados.
- [ ] Selecionar manualmente o veículo no formulário (qualquer modo) substitui o ícone ↩ por ✓ e remove o visual âmbar.
- [ ] Mudar o contexto global com formulário já aberto não limpa o campo `vehicle_id` do formulário. O toast de aviso aparece.
- [ ] Dashboard KPIs filtrados pelo veículo ativo quando modo = `single`.
- [ ] Dashboard Spotlight oculto quando modo = `none`.
- [ ] Listas de despesas e manutenções filtradas conforme o modo ativo.
- [ ] `/vehicles/[id]` e `/settings` ignoram o contexto.
- [ ] Veículo excluído como `activeVehicleId` é detectado no `FleetAside`, contexto é limpo e toast informativo é exibido.
- [ ] Grupo excluído como `activeGroupId` é detectado e limpo silenciosamente (sem toast).
- [ ] Botão "Trocar" abre o seletor de veículo/grupo.
- [ ] Botão "×" chama `clearAllSelection()` e retorna ao modo `none`.
- [ ] Nenhum componente além de `VehicleActivator` sincroniza URL searchParams com o store.
- [ ] Os termos canônicos estão centralizados em objeto de constantes (sem hardcode disperso).

---

## Fora de Escopo

- Suporte a múltiplos usuários compartilhando o mesmo contexto em tempo real (sessões colaborativas).
- Lançamento em lote de despesas para todos os veículos de um grupo — o modo `group` no formulário apenas pré-filtra; a opção "Lançar para o grupo inteiro" é apontada como atalho secundário mas sua implementação é feature separada.
- Persistência do modo `multi` ou `attribute` entre sessões (localStorage).
- Restrição da lista de veículos no formulário apenas aos membros do grupo em modo `group` — a lista é pré-filtrada mas não bloqueada.
- Tratamento de incompatibilidade entre tipos de veículos em modo `multi` — responsabilidade da camada de análise, não da seleção.
- Modificação do store Zustand existente — esta spec define comportamento sobre a estrutura já existente.

---

## Dependências

| Dependência | Tipo | Observação |
|-------------|------|-----------|
| Store Zustand (`use-dashboard-store.ts`) | Interna | Já contém `activeVehicleId`, `activeGroupId`, `multiSelectedIds`, `attributeFilter`, `selectionMode` e `clearAllSelection()`. Esta spec não altera a estrutura do store. |
| `Sidebar` (`apps/web/components/layout/sidebar.tsx`) | Interna | Receberá o novo slot "Em Foco" |
| `FleetAside` (`apps/web/components/layout/fleet-aside.tsx`) | Interna | Responsável pela detecção de staleness (veículo/grupo excluído) |
| `VehicleActivator` | Interna | Único ponto de sincronização URL ↔ store; deve ser identificado/criado antes da implementação do slot |
| API de Veículos (`GET /vehicles`) | Backend | Utilizada pelo `FleetAside` para detectar staleness — sem request adicional |
| API de Grupos (`GET /vehicle-groups`) | Backend | Idem para grupos |
| SPEC-20260531-001 | Spec | Dashboard — contexto afeta KPIs e Spotlight |
| [SPEC-20260521-003](../expenses/SPEC-20260521-003.md) | Spec | Formulário de despesas — RF-07 a RF-14 aplicam-se a este formulário |
| [SPEC-20260521-002](../maintenance/SPEC-20260521-002.md) | Spec | Formulário de manutenção — RF-07 a RF-14 aplicam-se a este formulário |
| [SPEC-20260525-001](../design-system/SPEC-20260525-001.md) | Spec | Paleta e tokens visuais (âmbar, espresso, azul, violet) usados nos estados do slot |

---

## Notas Técnicas

### Tabela de estados visuais do slot

| Modo | Fundo | Cor da borda | Estilo da borda | Badge | Ícone |
|------|-------|-------------|----------------|-------|-------|
| `none` | transparente | `muted` | tracejada | — | ⊕ cinza |
| `single` | `amber-50` | `amber-300` | sólida | âmbar | ícone do tipo (Car, Truck…) |
| `group` | `blue-50` | `blue-300` | sólida | azul + N membros | hexágono |
| `multi` | `amber-100` | `amber-400` | tracejada | âmbar + "N~" | multi-select |
| `attribute` | `violet-50` | `violet-300` | tracejada | violet | filtro |

Convenção: **borda sólida = contexto permanente** (persiste no reload); **borda tracejada = contexto temporário** (perde no reload).

### Layout do slot — sidebar expandido (modo `single`)

```
┌──── slot "Em Foco" ───────────────┐
│  EM FOCO                  [Trocar]│   ← label 9px muted + botão ghost
│  🚛  ABC-1234 · Hilux         [×]│   ← chip: ícone tipo + placa + modelo
└───────────────────────────────────┘
```

### Layout do slot — sidebar expandido (modo `none`)

```
┌───────────────────────────────────┐
│  ⊕  Selecionar veículo            │   ← borda tracejada, sem cor de fundo
└───────────────────────────────────┘
```

### Sidebar recolhido

Exibe apenas o ícone do modo ativo + dot colorido. Tooltip ao hover mostra detalhes completos (mesmo conteúdo do slot expandido).

### Semântica por feature

| Feature | `single` | `group` | `multi` | `attribute` | `none` |
|---------|----------|---------|---------|-------------|--------|
| Dashboard KPIs | Filtra por veículo | Filtra pelo grupo | Filtra pelos IDs | Filtra pelo atributo | Toda a frota |
| Dashboard Spotlight | Análise individual | Análise consolidada do grupo | Análise consolidada ad-hoc | Análise por atributo | **Oculto** |
| Lista de despesas | Filtra por veículo | Filtra pelo grupo | Filtra pelos IDs | Filtra pelo atributo | Todas as despesas |
| Lista de manutenções | Filtra por veículo | Filtra pelo grupo | Filtra pelos IDs | Filtra pelo atributo | Todas as manutenções |
| Relatórios | Escopo = veículo | Escopo = grupo | Escopo = seleção | Escopo = atributo | Escopo = frota inteira |
| Formulário despesa | Pré-seleciona (editável) | Campo vazio + dica de grupo | Campo vazio + N atalhos | Campo vazio + dropdown filtrado | Campo vazio |
| Formulário manutenção | Pré-seleciona (editável) | Campo vazio + dica de grupo | Campo vazio + N atalhos | Campo vazio + dropdown filtrado | Campo vazio |
| Ficha do veículo `/vehicles/[id]` | **Ignora** | **Ignora** | **Ignora** | **Ignora** | **Ignora** |
| Configurações / Preferências | **Ignora** | **Ignora** | **Ignora** | **Ignora** | **Ignora** |

### Rastreabilidade no código

Arquivos que implementam requisitos desta spec devem anotar:

```ts
// @spec SPEC-20260602-001 RF-XX
```

### Regras de domínio aplicáveis

As regras R-CTX-01 a R-CTX-06 são novas e foram definidas nesta sessão de design. Elas estão registradas no `RULES.md` com referência a esta spec. Resumo:

- **R-CTX-01**: Apenas um modo de contexto ativo simultaneamente — ativar qualquer modo zera os demais campos conflitantes.
- **R-CTX-02**: `single` e `group` persistem em localStorage; `multi` e `attribute` são efêmeros; logout limpa tudo.
- **R-CTX-03**: Formulários transacionais exigem `vehicle_id` singular. Contextos coletivos nunca propagam automaticamente.
- **R-CTX-04**: `VehicleActivator` é o único ponto de sincronização entre URL searchParams e store Zustand.
- **R-CTX-05**: Staleness de contexto é detectada e resolvida no `FleetAside`, não no store.
- **R-CTX-06**: Formulários capturam o contexto apenas no mount; mudanças posteriores no store não afetam o formulário aberto.

---

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
|--------|------|-------|-----------|
| 0.1 | 2026-06-02 | douglps | Criação inicial — rascunho a partir de sessão de design com especialistas |
| 1.0 | 2026-06-02 | douglps | Status alterado para `approved`; implementação concluída (focus-slot, context-filter-sync, use-vehicle-context-field, context-labels, store atualizado, expense-form, maintenance-form, pages de expenses e maintenance) |
| 1.1 | 2026-06-02 | douglps | Correções pós-implementação: bug fix na detecção de mudança de grupo (RF-14), clearAllSelection no logout (RF-19), toast de staleness com sonner (RF-16), filtro por grupo nas páginas de listagem (RF-17) |
| 1.2 | 2026-06-22 | douglps | RF-17.1: ContextFilterSync removido `searchParams` das dependências do useEffect para não sobrescrever filtros locais de página. Usa `window.location.search` para leitura não-reativa dos params atuais. |
