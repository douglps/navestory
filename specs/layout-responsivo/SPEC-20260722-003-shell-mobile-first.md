---
id: SPEC-20260722-003
title: "Shell Mobile-First e Migração Tailwind v3 → v4"
status: approved
date: 2026-07-22
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-NAV-01, R-NAV-02, R-NAV-03, R-NAV-04, R-DS-04]
security: []
camadas: [frontend, devops]
---

## Contexto

O shell de navegação do navestory (`apps/web/src/components/layout/sidebar.tsx`, `header.tsx` e `apps/web/src/app/(app)/layout.tsx`) foi construído para desktop: a sidebar é `fixed inset-y-0 left-0` sem nenhum breakpoint responsivo, e o layout reserva `pl-16`/`pl-64` de padding fixo em qualquer largura de viewport. Em telas de 375 px (iPhone SE, dispositivo de referência mínimo), sobram apenas ~215 px de área útil de conteúdo — inutilizável para formulários e tabelas.

O projeto irmão de referência **navestory-SaaS** (em `C:\Dev\Antigravity\navestory-SaaS-main`, Tailwind v4) já resolve isso com sidebar como drawer/overlay em mobile, header mobile-first com hamburger e bottom nav. Esta spec cobre os dois blocos de infraestrutura que desbloqueiam a paridade de experiência mobile:

- **Bloco A** — Migração do Tailwind v3 para v4 (infraestrutura de estilos): sem essa atualização, qualquer tentativa de copiar classes do projeto de referência produz erros de build.
- **Bloco B** — Shell mobile-first: converte a sidebar para drawer/overlay em mobile, torna o header responsivo com hamburger e elimina o padding de layout fixo.

O store de UI (`apps/web/src/lib/stores/ui-store.ts`) já possui `isMobileNavOpen` e `toggleMobileNav()` — não será necessário adicionar novo estado para o comportamento de drawer.

---

## Objetivo

Ao final da implementação: (1) o build do Next.js 16 + Turbopack usa Tailwind v4 sem erros; (2) em qualquer viewport abaixo de 768 px, a sidebar opera como drawer overlay e o conteúdo ocupa 100% da largura disponível; (3) nenhuma regressão visual em desktop (≥ 768 px).

---

## Histórias de Usuário e Critérios de Aceitação

### US-01 — navegação mobile via drawer

**Como** usuário do navestory em dispositivo móvel (< 768 px de largura), **quero** acessar o menu lateral por meio de um painel deslizável, **para** não perder área útil de conteúdo enquanto navego.

- **Dado que** estou em tela < 768 px e o drawer está fechado, **quando** carrego qualquer página autenticada, **então** a sidebar está fora do viewport (`-translate-x-full`) e o conteúdo principal ocupa 100% da largura sem scroll horizontal.
- **Dado que** o drawer está fechado, **quando** toco no botão hamburger do header, **então** a sidebar aparece sobreposta ao conteúdo com backdrop semitransparente (`bg-black/60`), e o foco é preso no drawer (trap focus).
- **Dado que** o drawer está aberto, **quando** toco no backdrop, **então** o drawer fecha e o backdrop desaparece (`isMobileNavOpen = false`).
- **Dado que** o drawer está aberto, **quando** pressiono `Esc`, **então** o drawer fecha.
- **Dado que** o drawer está aberto, **quando** navego para qualquer rota diferente, **então** o drawer fecha automaticamente antes da transição de página.

### US-02 — Header responsivo com hamburger

**Como** usuário em dispositivo móvel, **quero** ver um botão de hambúrguer no header, **para** saber onde está a navegação e abri-la sem adivinhação.

- **Dado que** estou em tela < 768 px, **quando** visualizo o header de qualquer página autenticada, **então** o botão hamburger (`aria-label="Abrir menu"`) está visível e acessível.
- **Dado que** estou em tela ≥ 768 px, **quando** visualizo o header, **então** o botão hamburger não é renderizado (`hidden md:flex` ou `md:hidden`).
- **Dado que** o drawer está aberto, **quando** visualizo o botão hamburger em mobile, **então** ele exibe ícone de fechar (`X`) em vez de hambúrguer e `aria-label="Fechar menu"`.
- **Dado que** estou em tela ≥ 768 px, **quando** verifico os elementos do header, **então** os elementos que eram ocultos em mobile (ex: breadcrumb, título de seção) estão visíveis normalmente.

### US-03 — Layout do shell sem padding fixo

**Como** usuário em qualquer dispositivo, **quero** que o conteúdo use todo o espaço disponível sem overflow horizontal nem deslocamento incorreto, **para** que a leitura e o uso de formulários sejam confortáveis.

- **Dado que** estou em tela < 768 px, **quando** navego entre módulos (despesas, manutenção, dashboard), **então** não existe scroll horizontal e o conteúdo começa na margem esquerda sem deslocamento de sidebar.
- **Dado que** estou em tela ≥ 768 px e a sidebar está expandida, **quando** visualizo o layout, **então** o conteúdo tem padding-left equivalente à largura da sidebar (comportamento pré-existente preservado, mas expresso com classes responsivas em vez de `pl-64` fixo).
- **Dado que** estou em tela ≥ 768 px e a sidebar está colapsada, **quando** visualizo o layout, **então** o conteúdo tem padding-left reduzido equivalente à largura colapsada (comportamento pré-existente preservado).

### US-04 — Build Tailwind v4 funcional em CI/dev

**Como** desenvolvedor, **quero** o projeto rodando em Tailwind v4, **para** usar CSS moderno e alinhar com o projeto de referência sem erro de build.

- **Dado que** a migração foi aplicada, **quando** executo `pnpm build` em `apps/web`, **então** o build conclui sem erros de PostCSS, de diretiva CSS desconhecida ou de plugin incompatível.
- **Dado que** a migração foi aplicada, **quando** executo `pnpm dev`, **então** o Turbopack compila sem erros e o hot-reload de CSS funciona normalmente.
- **Dado que** a migração foi aplicada, **quando** o pipeline de CI executa `pnpm build`, **então** o job passa sem nenhum erro relacionado a estilos.

---

## Requisitos Funcionais

### Bloco A — Migração Tailwind v3 → v4

| ID    | Requisito                                                                                                                                                                                                                                                                                                                                   | Prioridade | História relacionada |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------- |
| RF-01 | Atualizar `tailwindcss` para `^4.x`, adicionar `@tailwindcss/postcss@^4.x`, remover `autoprefixer` (v4 inclui autoprefixing nativo) em `apps/web/package.json` e `packages/ui/package.json` (se presente)                                                                                                                                   | Alta       | US-04                |
| RF-02 | Em `apps/web/postcss.config.js` (ou `.mjs`), substituir o plugin `tailwindcss` por `@tailwindcss/postcss`; remover `autoprefixer` da cadeia de plugins                                                                                                                                                                                      | Alta       | US-04                |
| RF-03 | Em `apps/web/src/app/globals.css`, substituir as diretivas `@tailwind base`, `@tailwind components`, `@tailwind utilities` por `@import "tailwindcss"` seguida de `@config "../../../tailwind.config.ts"` (caminho relativo ao arquivo CSS) — estratégia compat layer `@config`, que mantém o `tailwind.config.ts` existente sem alterações | Alta       | US-04                |
| RF-04 | Validar que `@tailwindcss/typography` na versão compatível com v4 está instalado; atualizar a versão no `package.json` se necessário; confirmar que o plugin continua funcional nas páginas que usam a classe `prose`                                                                                                                       | Alta       | US-04                |
| RF-05 | Executar build completo (`pnpm build`) e `pnpm dev` localmente e em CI, confirmar ausência de erros; documentar resultado no PR                                                                                                                                                                                                             | Alta       | US-04                |

### Bloco B — Shell mobile-first

| ID    | Requisito                                                                                                                                                                                                                                                                              | Prioridade | História relacionada |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------- |
| RF-06 | Em `apps/web/src/components/layout/sidebar.tsx`: abaixo de `md` (< 768 px), a sidebar usa `fixed inset-y-0 left-0 z-[4000]` e alterna `translate-x-0` / `-translate-x-full` conforme `isMobileNavOpen`; acima de `md`, mantém o comportamento atual de sidebar inline                  | Alta       | US-01                |
| RF-07 | Adicionar backdrop em `apps/web/src/components/layout/sidebar.tsx` (ou no layout pai): `<div className="fixed inset-0 z-[3999] bg-black/60 backdrop-blur-sm md:hidden" />` visível apenas quando `isMobileNavOpen === true`; clique no backdrop chama `toggleMobileNav()`              | Alta       | US-01                |
| RF-08 | Implementar fechamento do drawer por tecla `Esc` via `useEffect` com `keydown` listener em `sidebar.tsx` ou no componente de backdrop; o listener é registrado apenas quando o drawer está aberto                                                                                      | Alta       | US-01                |
| RF-09 | Implementar fechamento automático do drawer ao navegar: usar `usePathname()` do Next.js em um `useEffect`; ao detectar mudança de pathname com `isMobileNavOpen === true`, chamar `toggleMobileNav()`                                                                             | Alta       | US-01                |
| RF-10 | Em `apps/web/src/components/layout/header.tsx`: adicionar botão hamburger visível apenas em mobile (`md:hidden`) que chama `toggleMobileNav()`; ícone alterna entre `Menu` e `X` (Lucide) conforme `isMobileNavOpen`; `aria-label` atualiza conforme estado                            | Alta       | US-02                |
| RF-11 | Em `apps/web/src/components/layout/header.tsx`: converter para mobile-first — elementos que só fazem sentido em desktop (ex: breadcrumb estendido, título de seção com hierarquia) devem ser `hidden md:flex` ou equivalente; versão mobile mantém apenas logo/nome do app e hamburger | Média      | US-02                |
| RF-12 | Em `apps/web/src/app/(app)/layout.tsx`: substituir `pl-16`/`pl-64` condicional fixo por classes responsivas mobile-first; em mobile (`< md`) padding-left = 0; em `md` e acima, o offset é condicionado a `isSidebarCollapsed` conforme hoje — ex: `md:pl-16` / `md:pl-64`             | Alta       | US-03                |
| RF-13 | Garantir que todos os elementos interativos do drawer/header em mobile tenham área de toque `min-h-[44px] min-w-[44px]` (R-NAV-02); itens de menu da sidebar com `py-3` ou equivalente que resulte em ≥ 44 px de altura de toque                                                       | Alta       | US-01, US-02         |
| RF-14 | Adicionar `aria-expanded` e `aria-controls` ao botão hamburger; o drawer deve ter `role="dialog"` e `aria-modal="true"` em mobile para a semântica de sobreposição                                                                                                                     | Média      | US-01, US-02         |

---

## Requisitos Não-Funcionais

| ID     | Requisito                               | Métrica de Aceite                                                                                                                                               |
| ------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Sem regressão visual no shell desktop   | Screenshot diff em CI (ou revisão manual em PR) sem diferenças em viewports ≥ 768 px                                                                            |
| RNF-02 | Performance de build não regride com v4 | `pnpm build` em CI concluindo no mesmo tempo ± 20% do baseline atual                                                                                            |
| RNF-03 | Ausência de scroll horizontal em mobile | Viewport 375 px × 812 px sem `overflow-x` detectável em nenhuma rota autenticada                                                                                |
| RNF-04 | Acessibilidade do drawer                | Foco preso no drawer enquanto aberto; ao fechar, foco retorna ao botão hamburger; leitor de tela anuncia abertura/fechamento via `aria-live` ou `role="dialog"` |

---

## Fora de Escopo

- **Bottom nav / action dock**: componente de navegação fixo na base da tela em mobile — feature nova de maior impacto de UX, avaliar spec futura em `specs/layout-responsivo/`.
- **Migração idiomática para `@theme { }`**: resolver a duplicação de tokens entre `packages/ui/src/tokens/colors.ts` e `globals.css` exige coordenação com o design system; avaliar spec futura em `specs/design-system/`.
- **Gestos de swipe**: abrir/fechar drawer via swipe touch horizontal — avaliar somente após validação do uso do drawer básico em produção.
- **Testes E2E do shell responsivo**: cobertura E2E do fluxo de navegação mobile está no escopo de `specs/qa/SPEC-20260716-003`; esta spec não gera testes E2E próprios.
- **Animações de transição do drawer**: além da transição CSS de `translate`, qualquer animação de spring/inertia é descartada — fora do escopo desta entrega.

---

## Dependências

| Tipo       | Referência                                                    | Descrição                                                                               |
| ---------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Biblioteca | `tailwindcss@^4.x`                                            | Motor de CSS — substitui v3                                                             |
| Biblioteca | `@tailwindcss/postcss@^4.x`                                   | Plugin PostCSS para v4 (substitui integração direta `tailwindcss` no postcss.config)    |
| Biblioteca | `@tailwindcss/typography@^0.5.x` (confirmar versão v4-compat) | Plugin `prose` — deve permanecer funcional após migração                                |
| Store      | `apps/web/src/lib/stores/ui-store.ts`                         | `isMobileNavOpen`, `toggleMobileNav()` — já existem, não requerem alteração de contrato |
| Spec       | [SPEC-20260525-001](../design-system/SPEC-20260525-001.md)    | Design system fundamentos — paleta de tokens que continua inalterada nesta migração     |
| Spec       | [SPEC-20260716-003](../qa/SPEC-20260716-003.md)               | E2E Playwright — cobertura de regressão do shell pode ser expandida pós-entrega         |

---

## Notas Técnicas

### Decisão de migração Tailwind v3 → v4: estratégia `@config` (compat layer)

**Diagnóstico do repositório antes da decisão:**

| Aspecto                          | Estado atual                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Diretivas CSS                    | `@tailwind base/components/utilities` — substituição direta por `@import "tailwindcss"`               |
| Config                           | `apps/web/tailwind.config.ts` (TypeScript) — permanece inalterado                                     |
| Cores                            | `oklch(var(--x) / <alpha-value>)` em `theme.extend` — compatível com v4                               |
| Plugin único                     | `@tailwindcss/typography` — tem build v4 compatível (`@tailwindcss/typography@next` ou `^0.5.15+`)    |
| `@apply` / `theme()` / `@screen` | Zero ocorrências — risco zero de sintaxe legada                                                       |
| Token duplication                | `packages/ui/src/tokens/colors.ts` (canais OKLCH) e `globals.css` (variáveis CSS) sincronizados à mão |

**Decisão:** estratégia `@config` (compat layer), utilizando `@import "tailwindcss"` + `@config "./tailwind.config.ts"` no CSS. Esta abordagem:

- Mantém o `tailwind.config.ts` existente sem qualquer alteração
- Tem o menor risco de regressão visual (engine v4, config idêntica)
- É a mesma utilizada pelo projeto de referência navestory-SaaS (Antigravity)
- Permite reverter para v3 em um commit se necessário

**Alternativa descartada:** migração idiomática para `@theme { }` (CSS-first config), que:

- Resolveria a duplicação de tokens com `packages/ui/src/tokens/colors.ts` ao centralizar tudo no CSS
- Requer coordenação com o design system (`packages/ui`) e reescrita parcial de `globals.css`
- Tem escopo maior, mais adequado a uma spec dedicada em `specs/design-system/` após esta entrega estabilizar

### Vocabulário de store existente

O `useUIStore` já possui `isMobileNavOpen` (bool) e `toggleMobileNav()`. Esta spec **reutiliza** esses campos — não cria novos. O campo `isSidebarCollapsed` continua controlando o estado collapsed/expanded da sidebar em desktop.

### z-index do drawer

Reservar `z-[4000]` para o drawer e `z-[3999]` para o backdrop, alinhado com a escala de z-index documentada em `docs/ui-design/ux-rules.md` (seção "Menus Mobile Fullscreen"). Verificar o valor exato no arquivo antes de implementar e ajustar se a escala local divergir.

### Trap focus no drawer

Implementar com a biblioteca `@radix-ui/react-focus-trap` (se já disponível no projeto via Radix primitives) ou via hook nativo com `querySelectorAll('[tabindex]:not([tabindex="-1"]), a, button, ...')`. Não criar implementação própria de trap focus — verificar se o projeto já tem Radix UI ou solução equivalente antes de adicionar dependência.

---

## Entrada obrigatória na `matrices/rastreabilidade.md` (gate Nível 2)

Gate satisfeito — entrada completa em `matrices/rastreabilidade.md`, com código real e testes unitários preenchidos (RF-09, RF-12, RF-13 seguem com E2E/axe-core marcados como `⏳ pendente`, escopo de `SPEC-20260716-003`):

| Requisito                                   | Spec              | Código                                                                               | Teste                                            |
| ------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| RF-01 a RF-05 (Tailwind v4)                 | SPEC-20260722-003 | `apps/web/package.json`, `apps/web/postcss.config.*`, `apps/web/src/app/globals.css` | Build CI (`pnpm build`) — sem falha              |
| RF-06, RF-07, RF-08, RF-09 (Sidebar drawer) | SPEC-20260722-003 | `apps/web/src/components/layout/sidebar.tsx`                                         | ⏳ pendente (E2E em SPEC-20260716-003)           |
| RF-10, RF-11 (Header responsivo)            | SPEC-20260722-003 | `apps/web/src/components/layout/header.tsx`                                          | `apps/web/src/components/layout/header.spec.tsx` |
| RF-12 (Layout padding)                      | SPEC-20260722-003 | `apps/web/src/app/(app)/layout.tsx`                                                  | ⏳ pendente (E2E em SPEC-20260716-003)           |
| RF-13, RF-14 (A11y touch targets)           | SPEC-20260722-003 | `sidebar.tsx`, `header.tsx`                                                          | ⏳ pendente (auditoria axe-core)                 |

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito) não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
| ---- | ----------- | ------- |
|      |             |         |
