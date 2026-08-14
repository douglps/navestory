# ADR-013: Adoção de Tailwind CSS como solução de estilização

## Status

Accepted

## Contexto

Ao longo das iterações iniciais do navestory, a estilização do frontend cresceu de forma ad hoc: classes utilitárias Tailwind já estavam presentes em componentes desde antes da formalização do design system, mas sem decisão registrada, sem configuração centralizada de tokens e sem estratégia para compartilhar estilos entre `apps/web` e o futuro pacote `@navestory/ui`.

O momento de formalizar essa decisão foi a criação de `packages/ui` (commit `c5a7c2a`, 2026-07-19, pré-requisito de `SPEC-20260525-001`): ao extrair componentes compartilhados para o pacote interno, tornou-se necessário decidir explicitamente como tokens de cor, espaçamento, tipografia e raio seriam definidos, consumidos e mantidos consistentes entre o app Next.js e o Storybook do design system.

### Alternativas avaliadas

1. **CSS Modules** — padrão nativo do Next.js, sem dependência adicional. Descartado: excelente para escopo de estilo local, mas não resolve composição condicional de classes (o padrão de `variant` em CVA exigiria lógica manual) nem fornece o vocabulário visual compartilhado que queremos exportar de `packages/ui`. A ausência de utilitários de tema forçaria ou duplicação de variáveis CSS em cada módulo ou um sistema de design tokens paralelo artesanal — custo semelhante ao Tailwind sem os benefícios de produtividade.

2. **styled-components / Emotion (CSS-in-JS em runtime)** — expressividade alta e acesso direto a props do React para estilo dinâmico. Descartado: incompatível com React Server Components (Next.js 16 App Router), que é parte da arquitetura de roteamento adotada. Ambas as bibliotecas dependem de contexto de runtime que não existe em SSR puro/RSC, o que obrigaria a marcar componentes como `"use client"` sem necessidade de lógica de estado — criando acoplamento desnecessário entre decisão de estilo e decisão de renderização.

3. **vanilla-extract** — CSS-in-TypeScript com zero runtime, geração de classes estáticas em build time, totalmente compatível com RSC. Seria a alternativa mais sólida caso Tailwind fosse descartado: type-safety de ponta a ponta e compatível com o stack. Descartado em favor do Tailwind pelo custo de adoção: exige uma API própria (`style()`, `recipe()`, `createTheme()`) com curva de aprendizado não trivial, tooling de build adicional (`@vanilla-extract/vite-plugin`) e uma estratégia de tema que precisaria ser construída do zero — todo o investimento que Tailwind já entrega com menos configuração, dado que componentes baseados em Radix UI (já adotados) têm integração documentada e madura com Tailwind + CVA.

4. **UnoCSS** — CSS atômico on-demand, subconjunto compatível com Tailwind, bundle menor. Descartado: ecossistema ainda menos maduro do que Tailwind para o stack Next.js + Radix + RSC; a compatibilidade com `tailwind.config.ts` e `tailwind-merge` é aproximada, não garantida. O ganho de bundle não justifica o risco de incompatibilidades em um projeto que já usa utilitários Tailwind nas classes de componentes Radix.

5. **Tailwind CSS v4 (escolhida)** — utilitários atômicos gerados no build, zero runtime, integração nativa com PostCSS e Vite, compatível com RSC, ecossistema maduro no stack Next.js + Radix UI.

## Decisão

Adotar **Tailwind CSS v4** (`tailwindcss@^4.1.18`, instalado: 4.3.3) como solução única de estilização em `apps/web` e `packages/ui`, com a seguinte arquitetura de integração:

### Integração PostCSS / Vite

- `apps/web`: integração via `@tailwindcss/postcss` no `postcss.config.js` — caminho padrão para Next.js com PostCSS.
- `packages/ui` (Storybook): integração via `@tailwindcss/vite` — plugin Vite para o ambiente de desenvolvimento isolado do design system.
- `@tailwindcss/typography`: plugin oficial para prosa (`prose`), usado em telas de conteúdo estático (legais, onboarding).

### Configuração de tokens via `tailwind.config.ts`

A configuração JS/TS (`apps/web/tailwind.config.ts`) é mantida em vez da abordagem CSS-first nativa do Tailwind v4 (`@theme {}` em CSS). Motivo: os tokens de cor, espaçamento, tipografia e raio são definidos como objetos TypeScript em `packages/ui/src/tokens/` e importados diretamente no `tailwind.config.ts`, garantindo:

- **Fonte única de verdade tipada**: a mesma constante TypeScript alimenta o `tailwind.config.ts` (classes utilitárias do Tailwind) e pode ser consumida diretamente por lógica de componente que precise dos valores em runtime (ex: propriedade `stroke` de SVG inline), sem duplicação.
- **Validação em build time**: erros de token (valor `undefined`, tipo incompatível) são capturados pelo TypeScript antes de gerar CSS, não silenciosamente emitidos como string vazia.

A alternativa CSS-first (`@theme {}`) seria válida se os tokens fossem definidos e consumidos apenas em CSS — não é o caso; a camada TypeScript é parte intencional do contrato de `@navestory/ui`.

### Tokens de cor em canais OKLCH

As cores são definidas em `packages/ui/src/tokens/colors.ts` como **canais OKLCH separados** (`"L% C H"`, sem a função `oklch()` envolvendo), não como valores completos. Essa convenção é necessária para o modificador de opacidade do Tailwind funcionar (`bg-primary/50` → `oklch(var(--primary) / 0.5)`): o Tailwind injeta `<alpha-value>` na posição do alpha do `oklch()`, o que exige que a variável CSS exposta contenha apenas os canais, não a chamada completa.

Isso define um contrato entre `packages/ui/src/tokens/colors.ts` → `apps/web/src/app/globals.css` (variáveis CSS `--primary`, `--danger`, etc.) → `apps/web/tailwind.config.ts` (mapeamento `oklch(var(--x) / <alpha-value>)`) → classes utilitárias consumidoras.

### Composição de classes: `tailwind-merge` + `clsx` via `cn()`

O utilitário `cn()` em `packages/ui/src/lib/cn.ts` encapsula `clsx` (composição condicional de classes) + `tailwind-merge` (resolução de conflitos Tailwind, ex: `p-2 p-4` → `p-4`). Todos os componentes de `@navestory/ui` usam `cn()` para aceitar `className` externo sem efeitos colaterais de precedência inesperada.

### Escopo de `content`

O `tailwind.config.ts` de `apps/web` aponta `content` para `./src/**/*.{js,ts,jsx,tsx,mdx}` **e** `../../packages/ui/src/**/*.{js,ts,jsx,tsx}`, garantindo que classes usadas em componentes de `@navestory/ui` (consumidos como `workspace:*`) sejam incluídas no CSS gerado — sem necessidade de `safelist`, que seria frágil.

## Consequências

**Positivas:**

- Elimina o custo de runtime de CSS-in-JS (styled-components/Emotion) no caminho de RSC — estilo é resolvido 100% em build time.
- A convenção de utilitários atômicos reduz a superfície de CSS custom: regras de especificidade conflitante são raras porque cada utilitário tem escopo de uma propriedade. Menos CSS = menos bugs de cascata.
- `class-variance-authority` (CVA) integra nativamente com Tailwind para o padrão `variant` de componentes (`KpiCard`, `Button`, alertas), sem necessidade de lógica de `if/else` manual por variante.
- `tailwind-merge` resolve automaticamente colisões de classe quando consumidores de `@navestory/ui` sobrescrevem estilos via `className` — elimina a categoria de bug "minha classe não está sendo aplicada porque o componente tem `p-4` e eu passei `p-2`".
- `@tailwindcss/typography` entrega prosa acessível e legível para telas de conteúdo sem escrever CSS custom para tipografia de longa leitura.

**Negativas / trade-offs aceitos:**

- **Legibilidade de JSX**: classes utilitárias acumuladas em componentes complexos podem dificultar a leitura (`className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-medium ..."`). Mitigado pelo padrão CVA + `cn()` que agrupa variantes em constantes nomeadas em vez de interpolações inline.
- **Tailwind v4 ainda está em evolução**: a API CSS-first (`@theme {}`) é o caminho futuro declarado pelo projeto, mas ainda não tem paridade completa com todos os plugins e configurações do v3/v4 JS-based. A escolha de manter `tailwind.config.ts` é deliberada e revisável quando o ecossistema v4 estabilizar completamente — sem necessidade de ADR novo, desde que a mudança seja apenas de formato de configuração (JS → CSS), não de ferramenta.
- **Acoplamento `content` glob entre packages**: `apps/web/tailwind.config.ts` precisa apontar para os arquivos-fonte de `packages/ui` para incluir as classes no build. Se `packages/ui` mudar de localização no monorepo, o glob precisa ser atualizado. Risco baixo enquanto a estrutura do monorepo for estável.
- **Dependência de variáveis CSS como contrato**: a ponte tokens → variáveis CSS → classes Tailwind introduz um contrato implícito de três camadas. Qualquer uma delas quebrando silencia o erro de forma não óbvia (a variável CSS fica `undefined`, o valor computa para `oklch(undefined / 1)`, o navegador ignora). Mitigado por testes de contraste (`jest-axe`) que verificam o resultado visual renderizado, não apenas a declaração.

## Referências

- `apps/web/tailwind.config.ts` — configuração central, importa tokens de `@navestory/ui/tokens`
- `apps/web/postcss.config.js` — integração PostCSS via `@tailwindcss/postcss`
- `apps/web/src/app/globals.css` — variáveis CSS (`--primary`, `--danger`, etc.) geradas a partir de `packages/ui/src/tokens/colors.ts`
- `packages/ui/src/tokens/` — fonte única de verdade dos tokens (cores, espaçamento, raio, tipografia)
- `packages/ui/src/lib/cn.ts` — utilitário `cn()` (`clsx` + `tailwind-merge`)
- `packages/ui/package.json` — `@tailwindcss/vite` (Storybook), `tailwind-merge`, `class-variance-authority`
- `docs/architecture/decisions/ADR-008-frontend-state-management.md` — decisão de stack frontend relacionada (TanStack Query + Zustand), contexto de mesmo ciclo de formalização
- `specs/design-system/SPEC-20260525-001-*` — spec que motivou a criação de `packages/ui` e o estabelecimento da arquitetura de tokens
