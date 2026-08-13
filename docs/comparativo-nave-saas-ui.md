# Comparativo de UI: Nave-SaaS-main vs. navestory (componentes)

**Data:** 2026-08-13
**Autor:** Levantamento assistido (Claude)
**Repositórios comparados:**
- `C:\Dev\Antigravity\Nave-SaaS-main` — versão anterior do produto
- `C:\Dev\Nave` (navestory) — projeto atual, ativo

**Escopo:** auditoria componente-a-componente de UI — complemento explícito de `docs/comparativo-nave-saas-main.md`, que cobriu specs/backlog/arquitetura mas declarou na seção "Metodologia e limitações" que `packages/` não foi comparado em profundidade. Este documento preenche exatamente essa lacuna. Leia o documento geral primeiro para contexto e não repita as perguntas já respondidas lá (aside de frota, VehicleSidebarMenu, convenção de organização de componentes, fleet-command, backlogs, reports, ADRs fundacionais).

---

## Conclusão executiva (leia isto primeiro)

Em componentes de design system (`packages/ui`), o navestory está **estruturalmente à frente** do Nave-SaaS-main na maioria dos eixos: mais componentes no catálogo (+12 exclusivos vs. +11 do outro lado), sistema de tokens estruturado em módulos (`colors.ts`, `spacing.ts`, `radius.ts`, `typography.ts`), testes de unidade co-locados para quase todos os componentes, e promoção correta de componentes de domínio (ex.: `VehicleHealthScore`) para o nível compartilhado. Há, porém, **quatro gaps funcionais reais** que o Nave-SaaS-main resolve e o navestory contorna ou ignora: ausência de um `Select` nativo para listas curtas (o navestory usa `Combobox` para tudo), ausência de `DatePicker` de data simples (formulários usam `<input type="datetime-local">`), ausência de um `Typography` CVA unificado (cada componente reinventa classes de texto), e ausência do `MercosulPlate` como componente de **exibição** (o navestory tem apenas o `PlateInput` de entrada, não o display visual de placa).

Em componentes de aplicação (`apps/web`), o navestory introduziu quatro capacidades completamente novas sem equivalente no Nave-SaaS-main: PWA (quatro componentes), `action-dock`, `command-palette-trigger` e `EasterEggHeatmapWidget`. A diferença de organização (Nave-SaaS-main coloca formulários em arquivos dedicados com `react-hook-form`; navestory os embute inline em `page.tsx` com `useState` + `useMutation`) é uma decisão arquitetural consciente registrada em spec — não um gap de feature.

A inversão surpreendente descoberta durante a auditoria: o Nave-SaaS-main migrou `packages/ui` para `@base-ui/react` (biblioteca headless mais recente, substituto direto do Radix), enquanto o navestory escolheu **Radix UI v2** para seus primitivos. Ou seja: na dimensão de headless primitives, o Nave-SaaS-main está à frente, não o navestory. Isso é relevante ao avaliar portar `Select`, `Calendar`/`DatePicker` e `Popover`.

---

## Achado central 1 — `Select` nativo ausente no navestory

| | |
|---|---|
| **Onde (Nave-SaaS-main)** | `packages/ui/src/components/select.tsx` — exportado via `src/index.ts` |
| **Onde (navestory)** | Ausente no catálogo; `Combobox` usado como substituto universal |
| **Status Nave-SaaS-main** | Implementado, completo — Select, SelectTrigger (com botão de limpeza), SelectContent, SelectItem, SelectLabel, SelectGroup, SelectSeparator, SelectScrollUpButton/Down |
| **Existe em navestory?** | Não — `@radix-ui/react-popover` já é dependência, mas nenhum `Select` foi construído sobre ele |

O `Select` do Nave-SaaS-main é construído sobre `@base-ui/react/select` e inclui animações de entrada/saída via `data-open`/`data-closed`, alinhamento com o trigger, scroll arrows para listas longas e botão de limpeza inline no trigger. É uma solução madura para listas de opções fechadas (sem busca).

O navestory usa `Combobox` (searchable, com popup `cmdk`) em todos os contextos de seleção — incluindo listas curtas como tipo de combustível (5 opções) e categoria de manutenção. Confirmado por leitura de `apps/web/src/app/(app)/expenses/new/page.tsx` e `apps/web/src/app/(app)/maintenance/new/page.tsx`:

```tsx
// expenses/new/page.tsx — navestory usa Combobox para tipo de combustível (5 opções)
<Combobox
  aria-label="Tipo de combustível"
  options={FUEL_TYPE_OPTIONS.map((option) => ({...}))}
  ...
  searchPlaceholder="Buscar tipo..."
/>
```

**Problema de UX:** `Combobox` adiciona fricção desnecessária (campo de busca, popup de tela cheia em mobile, borda de `cmdk`) em situações onde um `Select` simples de lista fixa seria mais direto. WCAG 2.2 prefere o padrão nativo de combobox/listbox para listas curtas.

O Nave-SaaS-main usa Base UI para o Select, mas o navestory já tem `@radix-ui/react-popover` como dependência — é possível construir um `Select` sobre o `Popover` existente + primitivo HTML `<select>` nativo, sem adicionar nova dependência.

### Recomendação

**Considerar depois — designar ao `design-system` para avaliação.** Não portar diretamente o código do Nave-SaaS-main (dependeria de `@base-ui/react`, que não é dependência do navestory). Uma abordagem alternativa: usar `<select>` nativo estilizado (pattern "native select") para listas curtas fechadas — o que evita dependência nova e funciona bem em mobile. Avaliar com o `ux-researcher` quais formulários teriam maior ganho de usabilidade e criar spec em `specs/design-system/` antes de implementar.

**Impacto:** UX (redução de fricção em formulários de entrada de dados), sem breaking change de API nos formulários existentes (Combobox continuaria disponível para listas longas com busca).

---

## Achado central 2 — `DatePicker` (data simples) ausente no navestory

| | |
|---|---|
| **Onde (Nave-SaaS-main)** | `packages/ui/src/components/date-picker.tsx` + `packages/ui/src/components/calendar.tsx` + `packages/ui/src/components/popover.tsx` |
| **Onde (navestory)** | Formulários usam `<input type="datetime-local">` diretamente (HTML nativo) |
| **Status Nave-SaaS-main** | Implementado, completo — DatePicker com botão de limpeza, aria-label descritivo, locale ptBR, integração com Calendar |
| **Existe em navestory?** | `DateRangePicker` existe em `packages/ui`, mas não há DatePicker de data única |

O navestory tem `date-fns` e `react-day-picker` nas dependências de `packages/ui` (confirmado em `package.json`) — as mesmas bibliotecas usadas pelo Nave-SaaS-main para `Calendar` e `DatePicker`. A infraestrutura está disponível, o componente simplesmente não foi construído.

Confirmado por leitura dos formulários:
```tsx
// maintenance/new/page.tsx — navestory usa input nativo
<Input
  id="occurred_at"
  type="datetime-local"
  value={occurredAt}
  onChange={(event) => setOccurredAt(event.target.value)}
/>
```

O `<input type="datetime-local">` tem comportamento inconsistente entre navegadores (especialmente em iOS Safari, que renderiza spinners de roda em vez de input de texto) e não suporta localização ptBR diretamente — o usuário vê `MM/DD/YYYY` em alguns sistemas.

### Recomendação

**Considerar depois — porta de baixo esforço.** `date-fns`, `react-day-picker` e `DateRangePicker` (que já usa `Calendar` internamente) estão todos presentes. A principal peça faltante é expor `Calendar` como componente público e construir `DatePicker` (single mode) sobre o `DateRangePicker` existente como caso degenerado. Pode ser incluído em uma spec de `packages/ui` existente ou nova. Prioridade média — o input nativo funciona, mas prejudica UX em iOS.

**Impacto:** apenas `packages/ui` (novos exports `Calendar` e `DatePicker`); nenhuma breaking change.

---

## Achado central 3 — `Typography` e `Icon` ausentes no navestory

| | |
|---|---|
| **Onde (Nave-SaaS-main)** | `packages/ui/src/components/typography.tsx` — CVA com 8 variantes (body/lead/title/kpi/caption/label/heading/subheading) + weight/align/family; `packages/ui/src/components/icon.tsx` — wrapper com size tokens (xs/sm/md/lg) e color tokens (success/danger/warning/muted) |
| **Onde (navestory)** | Ausentes — cada componente declara classes Tailwind de texto ad hoc; ícones Lucide usados diretamente |
| **Status Nave-SaaS-main** | Implementados, com rastreabilidade (usados por `StatsCard`, `MaintenanceForm`, etc.) |
| **Existe em navestory?** | Não como componentes de `packages/ui` — o navestory tem `globals.css` com classes tipográficas utilitárias (`.kicker`, etc.), mas sem componente React encapsulando a escala |

Esses dois componentes têm impacto de consistência diferente do que de funcionalidade. A ausência de `Typography` significa que cada componente declara suas próprias variantes de texto de forma ad hoc: `"text-xl font-semibold"` em alguns lugares, `"text-lg font-bold"` em outros, `"text-[13px] font-bold"` em cards de veículo. Sem um `Typography` como contrato, mudanças na escala tipográfica exigem varredura manual de todo o codebase.

A ausência de `Icon` significa que ícones Lucide são usados diretamente com `className="w-4 h-4"` ou `className="size-5"` — sem tokens semânticos de tamanho e cor, sem garantia de `aria-hidden` aplicado consistentemente, sem `aria-label` padronizado para ícones funcionais.

### Recomendação

**Typography: Considerar depois** — é uma refatoração de médio esforço e risco (toca muitos arquivos). Recomenda-se criar a spec em `specs/design-system/` com mapeamento dos tamanhos atuais da `globals.css` para as variantes CVA antes de implementar. Não portar o componente do Nave-SaaS-main diretamente — o navestory tem OKLCH e tokens próprios, a paleta de classes difere.

**Icon: Considerar depois** — o impacto de acessibilidade (garantir `aria-hidden` em ícones decorativos e `role="img"` em ícones funcionais) justifica a criação de um wrapper. Porém, não é urgente se os componentes atuais já aplicam `aria-hidden` manualmente. Verificar cobertura antes de priorizar.

**Impacto:** ambos afetam muitos arquivos; priorizar em sprint dedicada de design system após estabilização funcional do produto.

---

## Achado central 4 — Storybook: configurado em um lado, stories reais no outro

| | |
|---|---|
| **Onde (Nave-SaaS-main)** | `.storybook/main.ts`, `.storybook/preview.ts`, `.storybook/vitest.setup.ts` presentes; `src/stories/` com Button.tsx, Header.tsx, Page.tsx (boilerplate padrão do `npx storybook init`, sem relação com os componentes do design system) |
| **Onde (navestory)** | Sem `.storybook/` config; `button.stories.tsx`, `card.stories.tsx`, `kpi-card.stories.tsx` co-locados com componentes; `@storybook/react-vite` e scripts `storybook`/`build-storybook` em `package.json` |
| **Status Nave-SaaS-main** | Configurado mas vazio de conteúdo real: as histórias em `src/stories/` são o scaffold genérico gerado automaticamente pelo Storybook CLI (componentes Button/Header/Page com CSS próprio, alheios ao design system); só `stats-card.stories.tsx` co-localizado é uma história real |
| **Existe em navestory?** | Histórias reais existem (3 componentes: button/card/kpi-card) mas sem configuração — não podem ser executadas sem `.storybook/main.ts` |

Situação paradoxal: os dois lados têm metade do que precisam. O Nave-SaaS-main tem a plataforma Storybook funcionando mas sem conteúdo relevante. O navestory tem histórias reais (as mais importantes para um design system: button, card, KPI card) mas sem a configuração para servi-las.

Para o navestory executar `pnpm storybook` com sucesso, basta criar `.storybook/main.ts` apontando para os arquivos `*.stories.tsx` existentes e `.storybook/preview.ts` importando os estilos globais. O Nave-SaaS-main tem esses dois arquivos e podem servir de referência direta.

### Recomendação

**Adotar agora — menor esforço/maior retorno desta auditoria.** Criar `.storybook/main.ts` e `.storybook/preview.ts` em `packages/ui/` do navestory, adaptados do Nave-SaaS-main. As histórias co-locadas (`button.stories.tsx`, `card.stories.tsx`, `kpi-card.stories.tsx`) passarão a funcionar imediatamente. Não há specs novas nem design system a criar — é só ligar a infraestrutura que está pela metade.

O `design-system` ou o próprio desenvolvedor pode fazer isso como chore: `feat(storybook): adiciona configuração Storybook ao packages/ui`.

**Impacto:** apenas `packages/ui/.storybook/` (2 arquivos novos); zero breaking change.

---

## Achado central 5 — `MercosulPlate` (display) ausente no navestory

| | |
|---|---|
| **Onde (Nave-SaaS-main)** | `apps/web/components/ui/mercosul-plate.tsx` — componente de **exibição** de placa com 3 tamanhos (compact/sm/lg), faixa azul BRASIL, cor `#003399` hardcoded (intencional: cor documental, não de UI) |
| **Onde (navestory)** | `packages/ui/src/components/plate-input.tsx` — componente de **entrada** (input com máscara progressiva BR/Mercosul) |
| **Status Nave-SaaS-main** | Implementado, usado em cards e headers de página de veículo |
| **Existe em navestory?** | Não — o display de placa nos cards de veículo usa texto mono bruto sem faixa visual |

Os dois componentes têm **propósitos complementares**: `PlateInput` é para formulários (entrada), `MercosulPlate` é para listas/cards (exibição). Não são equivalentes e não se substituem. O navestory acertou ao colocar `PlateInput` em `packages/ui`; falta fazer o mesmo para o componente de display.

O componente de exibição do Nave-SaaS-main é bem resolvido: usa a cor documental da placa como constante isolada (não polui os tokens de UI), suporta 3 tamanhos com uso declarado em comentário, e funciona tanto em light quanto dark (fundo `bg-white` + texto azul fixo — placa real não muda de cor com o tema).

### Recomendação

**Considerar depois — porta direta de baixo esforço.** O componente é puramente visual, sem dependências externas. Portar para `packages/ui/src/components/plate-display.tsx` (renomear para diferenciar de `plate-input.tsx`), exportar via `index.ts`, e usar em cards de veículo. A lógica de cor documental hardcoded é a decisão correta e deve ser preservada.

**Impacto:** apenas `packages/ui` (1 arquivo novo + 1 export); nenhum breaking change.

---

## Achados menores

### 1. `CurrencyShortcuts` ausente no navestory

| | |
|---|---|
| **Onde** | `packages/ui/src/components/currency-shortcuts.tsx` (Nave-SaaS-main) |
| **Status** | Implementado — chips de atalho de valor (`ShortcutItem` suporta valor fixo ou incremento relativo) |
| **Existe em navestory?** | Não |

Componente de linha de botões-chip para acelerar entrada de valores monetários em mobile (ex.: "+R$ 10", "+R$ 50", "R$ 100 cheio"). Útil especialmente nos formulários de abastecimento e manutenção, que já existem no navestory.

**Recomendação: Considerar depois.** Porta direta (sem dependências). Decisão de produto: se as personas (Carlos, motorista individual) frequentemente entram valores redondos, o ganho de UX em mobile justifica. Consultar `ux-researcher`. Se aprovado, incluir na próxima sprint de `design-system`.

---

### 2. `StatsCard` complementa, não substitui, o `KpiCard` do navestory

| | |
|---|---|
| **Onde** | `packages/ui/src/components/stats-card.tsx` (Nave-SaaS-main) — card com glass effect, glow background colorido, indicador de trend (TrendingUp/Down/Minus) com badge de percentual |
| **Existe em navestory?** | `KpiCard` existe — mais compacto, sem glass/glow |

Os dois não são duplicatas. `StatsCard` tem propósito visual mais rico (telas de analytics, dashboards de resumo executivo com ênfase em tendência); `KpiCard` é mais denso e adequado para grids de KPI compactos. O Nave-SaaS-main usa ambos em contextos diferentes.

O `StatsCard` depende de `Typography` e `Icon` (achados 3 e menores desta lista) — só faz sentido portar depois que esses dois componentes existirem no navestory.

**Recomendação: Considerar depois**, condicionado à criação de `Typography` e `Icon`. Usar como inspiração visual para `KpiCard` quando ele ganhar suporte a tendências mais ricas.

---

### 3. `Form` wrapper (react-hook-form) ausente no navestory — decisão consciente

| | |
|---|---|
| **Onde** | `packages/ui/src/components/form.tsx` (Nave-SaaS-main) — re-exporta `FormProvider`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` com contexto de campo e ID de acessibilidade automático |
| **Existe em navestory?** | Não — e de forma consciente |

O `form.tsx` do Nave-SaaS-main é o wrapper de `react-hook-form` clássico do shadcn/ui. O navestory **deliberadamente** usa `useState` + `useMutation` (TanStack Query via `apiClient`) em vez de react-hook-form, conforme anotado em múltiplos `page.tsx`:

```tsx
// maintenance/new/page.tsx — navestory
// "Arquitetura: adaptado à stack real do projeto (client component + useState + TanStack Query
//  chamando `apps/api` via `apiClient`) — SPEC-20260619-001 descreve react-hook-form +
//  Server Actions, ainda não construídos neste projeto (ver changelog da spec)."
```

A ausência é rastreável em spec. Não é um gap — é uma escolha arquitetural explícita.

**Recomendação: Nenhuma ação** — já decidido. Se a spec `SPEC-20260619-001` for reativada no futuro, o `form.tsx` do Nave-SaaS-main seria um bom ponto de partida para a implementação.

---

### 4. `Label` e `Popover` primitivos ausentes como exports de `packages/ui` no navestory

Nave-SaaS-main exporta `Label` (`@radix-ui/react-label`) e `Popover`/`PopoverTrigger`/`PopoverContent` (`@base-ui/react/popover`) de `packages/ui`.

No navestory: `@radix-ui/react-popover` é dependência de `packages/ui` (usado internamente em `DateRangePicker` e `Tooltip`) mas não é exportado como componente público. `Label` não existe como componente (`<label>` HTML puro nos formulários).

**Label — Recomendação: Adotar depois** com baixo esforço. `@radix-ui/react-label` não é dependência do navestory ainda, mas o impacto de adicionar é mínimo. A decisão de incluir ou não depende de adotar o `Form` wrapper (achado 3).

**Popover — Recomendação: Considerar depois.** O Popover Radix v2 já existe internamente no navestory. Se `DatePicker` (achado central 2) for implementado, o Popover precisará ser exposto. Pode ser co-lançado na mesma sprint.

---

### 5. `VehicleHealthScore` promovido corretamente para `packages/ui` no navestory

| | |
|---|---|
| **Onde (Nave-SaaS-main)** | `apps/web/components/dashboard/vehicle-health-score.tsx` — app-level, não compartilhado |
| **Onde (navestory)** | `packages/ui/src/components/vehicle-health-score.tsx` — promovido para o design system compartilhado |

O navestory fez a decisão correta ao promover `VehicleHealthScore` (anel SVG de progresso com limiar 70/40/0) para o pacote compartilhado. A referência de spec (`SPEC-20260531-001 RF-SH-02, SPEC-20260721-002 RF-02`) está no componente de `packages/ui`. No Nave-SaaS-main, o componente ficou em `apps/web` e é importado de lá por `VehicleHealthCard.tsx` — acoplamento de camada que o navestory eliminou.

**Recomendação: Nenhuma ação** — navestory está à frente aqui.

---

### 6. Padrão de formulários: componentes dedicados vs. inline em `page.tsx`

Nave-SaaS-main organiza cada formulário em arquivo próprio (`MaintenanceForm.tsx`, `ExpenseForm.tsx`, `FineForm.tsx`, `RecurringCostForm.tsx`) em `apps/web/components/<dominio>/`. Usa `react-hook-form` + `Form` wrapper + Server Actions.

navestory coloca toda a lógica de formulário inline nos arquivos `page.tsx` das respectivas rotas. Resultado: `apps/web/src/app/(app)/expenses/new/page.tsx` tem ~795 linhas; `apps/web/src/app/(app)/maintenance/new/page.tsx` tem mais de 300 linhas. Não existe um diretório `_components/` em nenhuma rota — os sub-componentes (ex.: `ExpenseTemplatesTray`, `KpiCards`, `UpcomingCostsTab`) são declarados no mesmo arquivo da página.

Este é um padrão que **funciona mas tem risco de crescimento**: à medida que formulários ganham campos (ex.: abastecimento já tem 8+ campos condicionais em `expenses/new`), o tamanho do `page.tsx` cresce sem limite natural.

**Recomendação: Nenhuma ação agora** — o padrão atual é consistente e a decisão de usar `apiClient`/TanStack em vez de Server Actions está registrada. Mas registrar como risco em `matrices/impacto.md` quando o próximo formulário de alta complexidade for adicionado: se `page.tsx` superar ~600 linhas funcionais, criar sub-componentes em `_components/` da mesma rota (extração parcial, sem mudar o padrão arquitetural).

---

### 7. PWA — capacidade nova no navestory sem equivalente no Nave-SaaS-main

Nave-SaaS-main tem apenas `components/layout/offline-banner.tsx` (banner simples "sem conexão").

navestory tem 4 componentes PWA totalmente novos:
- `pwa/install-prompt-banner.tsx` — CTA de instalação Chrome/Edge com `beforeinstallprompt`
- `pwa/ios-install-banner.tsx` — instruções de instalação via "Adicionar à tela inicial" para Safari iOS
- `pwa/connectivity-indicator.tsx` — indicador de status de conectividade
- `pwa/service-worker-update-listener.tsx` — listener de atualização do service worker

Todos têm testes de unidade (`*.spec.tsx`) e rastreabilidade via `@spec SPEC-20260712-001`.

**Recomendação: Nenhuma ação** — nova capacidade do navestory, sem regressão. Citado para registro de que a comparação foi feita e a diferença é intencional.

---

### 8. `action-dock` e `command-palette-trigger` — novos padrões de interação no navestory

`apps/web/src/components/layout/action-dock.tsx` — dock flutuante de ações rápidas, com teste (`action-dock.spec.tsx`).

`apps/web/src/components/layout/command-palette-trigger.tsx` — trigger do command palette global (Combobox de `packages/ui`), com teste.

Nenhum dos dois tem equivalente no Nave-SaaS-main. O command palette em especial é uma evolução relevante para UX de poder usuário (Ana/Roberto, gestores com muitas entidades).

**Recomendação: Nenhuma ação** — nova capacidade do navestory.

---

### 9. `vehicle-brand-logo` ausente no navestory

| | |
|---|---|
| **Onde** | `apps/web/components/ui/vehicle-brand-logo.tsx` (Nave-SaaS-main) |
| **Existe em navestory?** | Não — cards de veículo usam texto (marca/modelo) sem logo |

**Recomendação: Considerar depois**, condicionado a curadoria de assets de marcas (licença, cobertura de marcas populares no Brasil). Não é bloqueador funcional — é enriquecimento visual.

---

### 10. Tokens estruturados — navestory à frente

| | |
|---|---|
| **navestory** | `packages/ui/src/tokens/colors.ts`, `radius.ts`, `spacing.ts`, `typography.ts`, `index.ts` |
| **Nave-SaaS-main** | Apenas `packages/ui/src/tokens/index.ts` |

**Recomendação: Nenhuma ação** — navestory está à frente.

---

## Tabela-resumo

| # | Item | Onde encontrado | Status Nave-SaaS-main | Existe em navestory? | Recomendação |
|---|------|-----------------|----------------------|----------------------|--------------|
| 1 | `Select` nativo para listas curtas | `packages/ui/select.tsx` (Base UI) | Implementado | Não — Combobox usado como substituto | **Considerar depois** — criar spec em `specs/design-system/`; avaliar native-select em vez de portar Base UI |
| 2 | `DatePicker` single (data simples) | `packages/ui/date-picker.tsx` + `calendar.tsx` + `popover.tsx` | Implementado | Não — `<input type="datetime-local">` como workaround | **Considerar depois** — dependências já presentes (`date-fns`, `react-day-picker`); baixo esforço de porta |
| 3 | `Typography` CVA unificado | `packages/ui/typography.tsx` | Implementado | Não — classes Tailwind ad hoc | **Considerar depois** — mapear escala atual em `globals.css` antes de implementar; spec nova em `design-system/` |
| 4 | `Icon` wrapper com tokens de tamanho/cor | `packages/ui/icon.tsx` | Implementado | Não — Lucide usados diretamente | **Considerar depois** — impacto de acessibilidade (aria-hidden) justifica; menor esforço que Typography |
| 5 | Storybook configurado e funcional | `.storybook/main.ts` + `preview.ts` | Config existe; stories são boilerplate | Stories reais existem (3), sem config | **Adotar agora** — adicionar `.storybook/main.ts` e `preview.ts`; stories existentes funcionarão imediatamente |
| 6 | `MercosulPlate` (display, não input) | `apps/web/components/ui/mercosul-plate.tsx` | Implementado (compact/sm/lg) | Não — apenas `PlateInput` (entrada) | **Considerar depois** — porta para `packages/ui/plate-display.tsx`; sem dependências externas |
| 7 | `CurrencyShortcuts` | `packages/ui/currency-shortcuts.tsx` | Implementado | Não | **Considerar depois** — consultar `ux-researcher` sobre uso em mobile |
| 8 | `StatsCard` (glass + trend + glow) | `packages/ui/stats-card.tsx` | Implementado | Não — `KpiCard` cobre o caso básico | **Considerar depois**, condicionado a `Typography` + `Icon` |
| 9 | `Form` wrapper react-hook-form | `packages/ui/form.tsx` | Implementado | Não — decisão consciente de usar apiClient/useState | **Nenhuma ação** — decisão arquitetural registrada em spec |
| 10 | `Label` primitivo | `packages/ui/label.tsx` | Implementado | Não — `<label>` HTML | **Considerar depois**, vinculado à decisão de `Form` wrapper |
| 11 | `Popover` exposto como export público | `packages/ui/popover.tsx` | Implementado (Base UI) | Interno, não exportado | **Considerar depois**, co-lançar com `DatePicker` |
| 12 | `VehicleHealthScore` em `packages/ui` | `apps/web/components/dashboard/...` | App-level (acoplamento) | Sim, corretamente em `packages/ui` | **Nenhuma ação** — navestory está à frente |
| 13 | Formulários inline em `page.tsx` | `components/<dominio>/<form>.tsx` | Componentes dedicados (react-hook-form) | Inline no `page.tsx` | **Nenhuma ação** — decisão de stack consciente; monitorar crescimento de páginas |
| 14 | PWA (4 componentes) | Ausente (só `offline-banner`) | Simples offline banner | 4 componentes completos com testes | **Nenhuma ação** — nova capacidade do navestory |
| 15 | `action-dock` e `command-palette-trigger` | Ausentes | — | Sim, com testes | **Nenhuma ação** — nova capacidade do navestory |
| 16 | `vehicle-brand-logo` | `apps/web/components/ui/...` | Implementado | Não | **Considerar depois** — condicionado a curadoria de assets/licença |
| 17 | Tokens estruturados em módulos | `tokens/index.ts` (só) | Básico | `colors.ts`, `radius.ts`, `spacing.ts`, `typography.ts` | **Nenhuma ação** — navestory à frente |

---

## Metodologia e limitações

- Levantamento feito por leitura direta de arquivos de componentes, `package.json` e `index.ts` dos dois repositórios, com buscas por glob/grep para mapear presença/ausência de cada item.
- Cada componente exclusivo de um lado foi lido integralmente para determinar se é código funcional, boilerplate ou protótipo — não foram assumidas conclusões apenas pelo nome do arquivo.
- A comparação de componentes de aplicação (`apps/web/`) focou nos arquivos de `components/` e `app/**/page.tsx` para confirmar co-location real vs. ausência de feature. O padrão observado no navestory (formulários inline no `page.tsx`, sem `_components/`) divergiu da hipótese inicial do briefing (co-location por rota), o que é registrado explicitamente aqui.
- Não foi feita leitura linha a linha de todos os componentes compartilhados entre os dois lados (ex.: `combobox.tsx`, `table.tsx`, `breadcrumb.tsx`) — a comparação foi guiada pelos componentes exclusivos de cada lado, que é onde os gaps e diferenciais relevantes se encontram.
- O comportamento visual e de acessibilidade dos componentes não foi testado em browser — conclusões baseadas em leitura de código e props declaradas.
- `@base-ui/react` (Nave-SaaS-main) e `@radix-ui/react-*` (navestory) têm APIs similares mas não idênticas — portabilidade direta de componentes Base UI para o navestory exigiria adaptação de API, não apenas cópia de arquivo.
