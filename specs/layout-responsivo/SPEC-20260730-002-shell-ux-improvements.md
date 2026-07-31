---
id: SPEC-20260730-002
title: "Melhorias de UX do Shell — Hold-to-Confirm Logout, Avatar Dropdown e Sidebar Persistente com Header Full-Width"
status: draft
date: 2026-07-30
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-NAV-01, R-NAV-02, R-NAV-04, R-NAV-05, R-NAV-06, R-NAV-07, R-NAV-08]
security: [S1]
camadas: [frontend]
---

## Contexto

O shell de navegação do Nave (sidebar, header e layout raiz) passou pela migração mobile-first em SPEC-20260722-003 e está funcional. Porém, três lacunas de UX permanecem:

**1. Logout sem proteção contra clique acidental**
O botão "Sair" na sidebar executa `logout()` imediatamente num clique simples (`onClick={() => void logout()}`). Em fluxos mobile — onde o botão ocupa `min-h-[44px]` e é fácil de atingir inadvertidamente — isso representa risco de interrupção da sessão sem intenção. A função `logout()` em `apps/web/src/lib/auth/logout.ts` já é robusta (limpa `useDashboardStore`, remove `"nave-dashboard-context"` do `sessionStorage`, chama `clearApiCache()` e redireciona para `/login`); o problema é a ausência de confirmação antes de disparar essa sequência.

Adicionalmente, o header não oferece nenhum ponto de acesso à identidade do usuário nem ao logout — o único ponto é a sidebar, que em mobile fica oculta atrás do drawer.

**2. Colapso de sidebar sem persistência**
O toggle colapsar/expandir da sidebar funciona (`toggleSidebarCollapsed()` em `useUIStore`), mas `isSidebarCollapsed` no `ui-store.ts` não usa o middleware `persist` do Zustand — o estado é perdido a cada reload ou abertura de nova aba.

**3. Header não ocupa a largura total da viewport**
A estrutura atual em `apps/web/src/app/(app)/layout.tsx`:

```
flex min-h-screen
  └─ Sidebar (fixed inset-y-0 left-0 — fora do fluxo)
  └─ div.flex-1 (md:pl-16 ou md:pl-64)
       └─ Header (sticky top-0) ← começa APÓS o pl compensado
       └─ FinancialSubheader
       └─ {children}
```

O `Header` fica dentro da coluna de conteúdo. Em desktop, ele começa na borda direita da sidebar (com `pl-16`/`pl-64`), não na borda esquerda da viewport. Isso produz um header visualmente "partido" quando estado colapsado muda, e impede elementos de largura total (barra de busca global, breadcrumb, etc.) de aproveitarem 100% da tela.

O projeto de referência (`C:\Dev\Antigravity\Nave-SaaS-main`) resolve os três pontos: hold-to-confirm no logout da sidebar, dropdown de avatar no header e shell com `flex-col` + sidebar in-flow em desktop.

---

## Objetivo

Ao final da implementação:
1. O botão de logout na sidebar exige que o usuário mantenha pressionado por 1.000 ms, com barra de progresso visual, antes de chamar `logout()`.
2. O header exibe um dropdown de avatar com nome/email do usuário, link para configurações e logout por clique simples.
3. O colapso da sidebar sobrevive a reload e nova aba (persistência em `sessionStorage`).
4. O `Header` ocupa 100% da largura da viewport em desktop, independente do estado colapsado/expandido da sidebar.

---

## Histórias de Usuário e Critérios de Aceitação

### US-01 — Logout com proteção contra clique acidental na sidebar

**Como** usuário mobile, **quero** que o logout da sidebar exija que eu segure o botão por um segundo, **para** não encerrar minha sessão acidentalmente ao tocar na área do botão.

- **Dado que** estou com a sidebar aberta, **quando** toco e solto rapidamente o botão "Sair" (menos de 1.000 ms), **então** nenhuma ação ocorre e a sessão permanece ativa.
- **Dado que** estou com a sidebar aberta, **quando** mantenho o botão "Sair" pressionado por 1.000 ms completos, **então** o `logout()` é chamado e sou redirecionado para `/login`.
- **Dado que** inicio o hold no botão "Sair", **quando** observo a UI durante o pressionamento, **então** uma barra de progresso (ou indicador equivalente) avança visualmente durante os 1.000 ms.
- **Dado que** inicio o hold no botão "Sair", **quando** solto antes de completar os 1.000 ms, **então** a barra de progresso volta ao estado inicial sem chamar `logout()`.

### US-02 — Acesso à identidade e ao logout pelo header

**Como** usuário, **quero** ver meu nome/email no header e poder fazer logout de lá, **para** ter acesso rápido à minha identidade e ao logout sem abrir a sidebar.

- **Dado que** estou autenticado, **quando** vejo o header, **então** um elemento de avatar (iniciais do meu nome ou foto de perfil) é exibido na extremidade direita.
- **Dado que** clico no avatar, **quando** o dropdown abre, **então** vejo meu nome completo e e-mail (somente leitura), um link para `/settings/account` e um botão "Sair".
- **Dado que** o dropdown está aberto e clico em "Sair", **quando** a ação é executada, **então** `logout()` é chamado e sou redirecionado para `/login` (sem hold-to-confirm neste ponto).
- **Dado que** o dropdown está aberto e não tenho foto de perfil cadastrada, **quando** o avatar é renderizado, **então** as iniciais do meu nome são exibidas como fallback.

### US-03 — Colapso de sidebar persistente entre reloads

**Como** usuário que prefere a sidebar colapsada para ter mais espaço de conteúdo, **quero** que minha preferência seja lembrada ao recarregar a página ou abrir uma nova aba, **para** não precisar recolher a sidebar manualmente toda vez.

- **Dado que** colapsé a sidebar e recarrego a página, **quando** a aplicação carrega, **então** a sidebar continua colapsada.
- **Dado que** expandi a sidebar e abro uma nova aba, **quando** a nova aba carrega, **então** a sidebar está expandida (consistente com a outra aba).
- **Dado que** faço logout, **quando** faço login novamente, **então** a sidebar volta ao estado padrão (expandida), pois o `sessionStorage` foi limpo pelo `logout()`.

### US-04 — Header ocupando largura total da viewport

**Como** usuário em desktop, **quero** que o header abranja toda a largura da tela, **para** ter uma identidade visual coesa e poder usar elementos de largura total no header no futuro.

- **Dado que** estou em desktop com a sidebar expandida, **quando** visualizo o header, **então** ele se estende da borda esquerda à borda direita da viewport (não começa após a sidebar).
- **Dado que** estou em desktop com a sidebar colapsada, **quando** visualizo o header, **então** o header permanece com a mesma largura (100% da viewport) — não "pula" nem sofre reflow ao colapsar/expandir.
- **Dado que** estou em mobile, **quando** visualizo o header, **então** o comportamento atual é preservado (hamburger, sem regressão).

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | História |
|----|-----------|------------|---------|
| RF-01 | Substituir o `onClick` simples do botão "Sair" na sidebar por hold-to-confirm de 1.000 ms (R-NAV-05) | Alta | US-01 |
| RF-02 | Exibir barra de progresso visual que avança linearmente durante o hold (animação CSS ou via estado React); a barra volta ao zero se o pressionamento for cancelado antes de completar | Alta | US-01 |
| RF-03 | Implementar via eventos `onMouseDown`/`onTouchStart` (início do hold) e `onMouseUp`/`onMouseLeave`/`onTouchEnd`/`onTouchCancel` (cancelamento); o `logout()` é invocado no callback interno de "timer concluído", não nesses eventos | Alta | US-01 |
| RF-04 | Criar componente `AvatarDropdown` no header com: avatar (iniciais do nome como fallback), nome completo, email (somente leitura), link para `/settings/account`, botão "Sair" com clique simples chamando `logout()` (R-NAV-08) | Alta | US-02 |
| RF-05 | Os dados de nome/email do usuário logado no `AvatarDropdown` devem ser obtidos via store ou context já disponível no frontend (sem chamada de API exclusiva para esse componente) | Média | US-02 |
| RF-06 | Adicionar `persist` do Zustand ao `useUIStore` com `storage: createJSONStorage(() => sessionStorage)`, `name: "nave-ui-state"`, e `partialize` serializando somente `isSidebarCollapsed` (excluindo `isMobileNavOpen` e `toasts`) (R-NAV-06) | Alta | US-03 |
| RF-07 | A função `logout()` em `apps/web/src/lib/auth/logout.ts` deve remover a chave `"nave-ui-state"` do `sessionStorage` junto com `"nave-dashboard-context"` | Alta | US-03 |
| RF-08 | Reestruturar `apps/web/src/app/(app)/layout.tsx` para wrapper `flex-col`: `Header` como irmão de uma row `flex` contendo sidebar e conteúdo (R-NAV-07); eliminar `md:pl-16`/`md:pl-64` da coluna de conteúdo | Alta | US-04 |
| RF-09 | Na reestruturação do layout, a sidebar no desktop (≥ md) deixa de ser `fixed inset-y-0 left-0` e passa a ser in-flow (`md:static md:translate-x-0`); em mobile mantém `fixed inset-y-0 left-0` para o comportamento de drawer (R-NAV-01 preservada) | Alta | US-04 |
| RF-10 | O `FinancialSubheader` não exige ajuste de largura/posicionamento — continua dentro do `flex-1` de conteúdo após a reestruturação | Baixa | US-04 |

---

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|-----------------|
| RNF-01 | A reestruturação do layout (RF-08/RF-09) não causa regressão visual em desktop — sidebar, header e conteúdo mantêm dimensões e posições corretas | Validação manual nos breakpoints md (768 px), lg (1024 px), xl (1280 px); sem reflow ao colapsar/expandir |
| RNF-02 | O comportamento de drawer mobile (R-NAV-01, R-NAV-02, R-NAV-04) é completamente preservado | Sidebar continua como `fixed inset-y-0 left-0` em mobile; hamburger abre/fecha; Esc fecha; R-NAV-04 aplicada |
| RNF-03 | O hold-to-confirm é acessível: `aria-label` descreve o comportamento ("Segure para sair"); `aria-busy` ou `aria-valuenow` comunicam o progresso em leitores de tela | Validação manual com VoiceOver/NVDA |
| RNF-04 | O `AvatarDropdown` fecha ao pressionar `Esc` e ao clicar fora (padrão do componente de dropdown/popover usado) | Teste manual; coberto pelo primitivo `@radix-ui/react-popover` ou `DropdownMenu` |
| RNF-05 | A persistência do `isSidebarCollapsed` não impacta a inicialização (SSR/hydration): `useUIStore` deve tratar `skipHydration: true` ou usar `onRehydrateStorage` para evitar hydration mismatch | Build sem erro de hydration; sem flash de layout |

---

## Fora de Escopo

- Não inclui: swipe gesture mobile para abrir/fechar a sidebar (avaliado e descartado por baixa prioridade).
- Não inclui: auto-colapso da sidebar por `ResizeObserver` ao redimensionar a janela.
- Não inclui: foto de perfil customizada no avatar (cadastro de foto é feature separada).
- Não inclui: notificações ou badge de contagem no avatar dropdown.
- Não inclui: persistência do estado da sidebar em `localStorage` (mantido em `sessionStorage` conforme convenção do projeto; tradeoff documentado em Notas Técnicas).
- Não inclui: hold-to-confirm no logout do avatar dropdown do header (confirmação simples é suficiente para esse ponto de acesso mais explícito).

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260722-003 | Define R-NAV-01..R-NAV-04 e a estrutura de drawer mobile que deve ser preservada |
| Spec | SPEC-20260603-001 RF-17 | `logout()` já remove contexto de `sessionStorage`; esta spec estende com a remoção de `"nave-ui-state"` |
| Biblioteca | `zustand/middleware` (`persist`, `createJSONStorage`) | Já usado em `use-dashboard-store.ts`; não adiciona dependência nova |
| Componente | `@radix-ui/react-dropdown-menu` ou `@radix-ui/react-popover` | Para o `AvatarDropdown`; verificar se já transitivo em `packages/ui` antes de instalar |

---

## Notas Técnicas

### Hold-to-Confirm

O padrão de referência em `Nave-SaaS-main/apps/web/components/layout/sidebar.tsx` (linhas ~669–760) usa `useRef<NodeJS.Timeout>` para o timer e `useState` para o progresso (`0..100`). A animação da barra pode ser `transition-[width] duration-[1000ms] linear` em um `<div>` interno. O timer deve ser limpo em cleanup do `useEffect` para evitar chamada de `logout()` após desmonte do componente.

A lógica de limpeza existente em `logout()` (`clearAllSelection()`, remoção do sessionStorage, `clearApiCache()`, redirect) deve ser mantida integralmente — é mais completa que o equivalente na referência.

### Persistência via sessionStorage vs localStorage

`sessionStorage` isola o estado por aba (uma aba colapsada não afeta outra). `localStorage` compartilharia a preferência entre abas e sobreviveria ao fechamento do browser — semanticamente mais adequado para uma preferência de layout visual. Esta spec usa `sessionStorage` para seguir a convenção já estabelecida em `use-dashboard-store.ts` (`"nave-dashboard-context"`) e simplificar a limpeza no logout (uma única estratégia de storage). Se o produto decidir migrar para `localStorage` no futuro, a mudança é de uma linha (`sessionStorage` → `localStorage` no `createJSONStorage`).

### Reestruturação do Layout (RF-08/RF-09)

Estrutura alvo de `layout.tsx`:

```tsx
<div className="flex min-h-screen flex-col">
  <Header />                        {/* full-width, sticky top-0 */}
  <div className="flex flex-1">
    <Sidebar />                     {/* md:static; mobile: fixed drawer via R-NAV-01 */}
    <div className="flex-1 overflow-y-auto">
      <FinancialSubheader />
      {children}
    </div>
  </div>
</div>
```

A sidebar no `sidebar.tsx` precisa de condicionamento por breakpoint: `fixed inset-y-0 left-0 md:static md:inset-auto` para alternar entre drawer (mobile) e in-flow (desktop). O `z-[250]` do drawer e o backdrop `z-[240]` permanecem, mas só são relevantes em mobile (em desktop a sidebar é static, logo z-index não interfere).

### AvatarDropdown e Dados do Usuário

O frontend já deve ter acesso ao `profile` do usuário autenticado via TanStack Query (cache de `/users/me` ou equivalente). O componente `AvatarDropdown` deve consumir esse cache sem disparar nova chamada. Iniciais calculadas a partir do `name`: primeiras letras de cada token separado por espaço, limitado a 2 caracteres (ex: "Douglas Lopes" → "DL").

---

## Changelog (pós-aprovação)

| Data | O que mudou | Por quê |
|------|-------------|---------|
| | | |
