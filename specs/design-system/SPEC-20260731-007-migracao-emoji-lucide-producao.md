---
id: SPEC-20260731-007
title: "Migração de Emoji para Ícones Lucide — KPI Catalog e Feed de Atividades"
status: approved
date: 2026-07-31
author: Douglas Lopes (lps.doug@protonmail.com)
rules: []
security: []
camadas: [frontend, design]
---

## Contexto

O design system do navestory define formalmente o padrão de iconografia em `specs/design-system/PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md` §8 e exemplifica o padrão na vitrine em `apps/web/src/app/(app)/design-system/_components/sections/iconografia.tsx`: biblioteca Lucide (`lucide-react`), stroke-based, grid 24×24px, traço 1.5–2px, cor via `currentColor`, proibido ícone multicolor "sticker".

No entanto, dois pontos de produção — as telas de maior visibilidade do produto — ainda utilizam emojis crus como ícone funcional:

1. **`apps/web/src/components/dashboard/kpi-catalog.ts`** — campo `icon: string` com 8 emojis (💰⛽❤️🔧🚗📅⏳⚠️) consumidos por `DashboardKpiGrid.tsx` e `KpiPicker.tsx`.
2. **`apps/web/src/app/(app)/atividades/page.tsx`** — constante `DOMAIN_LABELS` com campo `icon: string` emoji para 9 domínios de auditoria, consumida pela função `domainInfo()` e pelo render da tabela do feed.

A análise de impacto IMPACTO-046 (registrada em `matrices/impacto.md`, 2026-07-31) confirma: risco baixo, ~2h de esforço, zero quebra de teste existente (nenhum spec verifica o emoji), zero mudança em lógica de negócio. A dependência `lucide-react@^1.25.0` já é declarada em `apps/web/package.json`.

Enquanto a inconsistência persistir, o usuário final vê emoji em dashboard e atividades mas Lucide em todo o restante da interface, criando ruído visual incompatível com o princípio "Calm UI" definido no design system.

---

## Objetivo

Substituir todos os emojis usados como ícones funcionais em `kpi-catalog.ts` e `atividades/page.tsx` — e nos render sites que os consomem — por componentes Lucide, alinhando esses pontos ao padrão de iconografia já documentado no design system. Nenhuma lógica de negócio é alterada; a mudança é exclusivamente de representação visual.

---

## Histórias de Usuário e Critérios de Aceitação

### US-01: Dashboard com iconografia consistente

**Como** usuário da frota, **quero** ver ícones visuais consistentes nos cards de KPI do dashboard, **para** ter uma experiência visual coerente com o restante do produto e não ser surpreendido por emojis num contexto profissional.

- **Dado que** estou na tela `/dashboard` com o grid de KPIs carregado, **quando** visualizo os cards de KPI (Gastos do Mês, Custo/km, Saúde da Frota, etc.), **então** cada card exibe um ícone Lucide em vez de um emoji, com tamanho 16×16px e cor herdada via `currentColor`.
- **Dado que** estou configurando quais KPIs exibir no seletor `KpiPicker`, **quando** vejo a lista de opções de KPI com checkbox, **então** cada opção exibe o ícone Lucide correspondente (16×16px) em vez do emoji.
- **Dado que** um KPI está no estado "indisponível" (sem dados suficientes), **quando** o card renderiza o indicador de status, **então** o ícone de aviso usa `TriangleAlert` (Lucide) em vez do emoji ⚠ hardcoded.

### US-02: Feed de atividades com ícones de domínio Lucide

**Como** usuário da frota, **quero** ver ícones de domínio consistentes no feed de atividades (`/atividades`), **para** identificar rapidamente o tipo de evento (veículo, despesa, manutenção, multa, etc.) sem depender de emojis cujo rendering varia por sistema operacional e plataforma.

- **Dado que** estou na página `/atividades` com registros de auditoria carregados, **quando** visualizo a tabela de eventos, **então** a coluna de domínio exibe o ícone Lucide correspondente ao tipo de evento em vez de um emoji.
- **Dado que** o estado de lista vazia é atingido (sem atividades no período), **quando** o `EmptyState` é renderizado, **então** o ícone do empty state usa `ShieldAlert` (Lucide) em vez do emoji 🛡️.

### US-03: Convenção de adição de novo KPI ou domínio sem reintroduzir emoji

**Como** desenvolvedor que vai adicionar um novo tipo de KPI ou domínio de atividade no futuro, **quero** encontrar exemplos Lucide já estabelecidos nas constantes `kpi-catalog.ts` e `DOMAIN_LABELS`, **para** seguir o padrão por analogia e não reintroduzir emojis por falta de referência.

- **Dado que** um desenvolvedor abre `kpi-catalog.ts` para adicionar uma nova entrada de KPI, **quando** lê o campo `icon`, **então** vê o tipo `LucideIcon` e exemplos de componentes Lucide já importados — tornando evidente que o padrão é Lucide, não emoji.
- **Dado que** o projeto não possui lint rule capaz de bloquear emoji em campos `icon` automaticamente, **quando** a spec é consultada, **então** a seção de notas técnicas documenta explicitamente essa limitação e reforça a convenção como responsabilidade de revisão de código.

---

## Requisitos Funcionais

| ID    | Requisito                                                                                                                                                                                                                                                                     | Prioridade | História relacionada |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------- |
| RF-01 | Em `kpi-catalog.ts`, o campo `icon` muda de `string` (emoji) para `LucideIcon` (import de tipo de `lucide-react`). O arquivo permanece `.ts` (sem virar `.tsx`) — `LucideIcon` é import de tipo, sem JSX no arquivo.                                                          | Alta       | US-01, US-03         |
| RF-02 | Os 8 emojis do catálogo de KPI são substituídos pelos componentes Lucide conforme a tabela de mapeamento da seção "Notas Técnicas".                                                                                                                                           | Alta       | US-01                |
| RF-03 | Em `DashboardKpiGrid.tsx`, o render de `meta.icon` (atualmente `<span aria-hidden>{meta.icon}</span>`) é atualizado para instanciar o componente Lucide dinamicamente (ex.: `<meta.Icon size={16} aria-hidden />`), usando `size={16}` adequado ao contexto de card compacto. | Alta       | US-01                |
| RF-04 | O `<span aria-hidden>⚠</span>` hardcoded em `DashboardKpiGrid.tsx` (estado "unavailable" do KPI, aprox. linha 120) é substituído por `<TriangleAlert size={16} aria-hidden />`.                                                                                               | Alta       | US-01                |
| RF-05 | Em `KpiPicker.tsx`, o render do campo `icon` da lista de checkboxes é atualizado de interpolação de string para instância Lucide com `size={16}` (contexto de label/checkbox — menor que o padrão de 24px da vitrine).                                                        | Alta       | US-01                |
| RF-06 | Em `atividades/page.tsx`, o campo `icon` de `DOMAIN_LABELS` muda de `string` (emoji) para `LucideIcon`. A função `domainInfo()` tem seu tipo de retorno atualizado de forma correspondente.                                                                                   | Alta       | US-02, US-03         |
| RF-07 | Os 9 domínios de `DOMAIN_LABELS` (vehicles, expenses, maintenances, fines, recurring_costs, vehicle_odometer_cycles, auth, users, fallback) são substituídos pelos componentes Lucide conforme a tabela de mapeamento da seção "Notas Técnicas".                              | Alta       | US-02                |
| RF-08 | O render site do campo `icon` na tabela de atividades é atualizado para instanciar o componente Lucide com tamanho adequado ao contexto de tabela.                                                                                                                            | Alta       | US-02                |
| RF-09 | O `<EmptyState icon="🛡️" .../>` em `atividades/page.tsx` é atualizado para `<EmptyState icon={<ShieldAlert size={24} aria-hidden />} .../>` (ou prop equivalente que o componente `EmptyState` aceite como `ReactNode`).                                                      | Média      | US-02                |
| RF-10 | Todos os arquivos alterados recebem comentário de rastreabilidade `// @spec SPEC-20260731-007 RF-XX` no topo ou na função correspondente, usando a sintaxe nativa de TS.                                                                                                      | Baixa      | —                    |

---

## Requisitos Não-Funcionais

| ID     | Requisito                          | Métrica de Aceite                                                                                                                                                                                                                        |
| ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Sem regressão de build             | `next build` e `tsc --noEmit` terminam sem erro após a migração                                                                                                                                                                          |
| RNF-02 | Sem regressão de testes existentes | `pnpm test` (unit + component) continua verde; nenhum teste precisa ser alterado pois nenhum verifica emoji                                                                                                                              |
| RNF-03 | Consistência de tamanho de ícone   | KPI cards e KpiPicker usam `size={16}`; tabela de atividades usa o tamanho definido na linha de render existente (verificar contexto e documentar decisão no PR); EmptyState usa `size={24}` (padrão do design system para empty states) |
| RNF-04 | Acessibilidade                     | Todos os ícones decorativos mantêm `aria-hidden` (já presente nos emojis — não regredir)                                                                                                                                                 |
| RNF-05 | Sem dependência nova               | `lucide-react@^1.25.0` já está em `apps/web/package.json`; nenhum `npm install` adicional é necessário                                                                                                                                   |

---

## Fora de Escopo

- Não inclui: criação de regra de lint/ESLint para bloquear emoji em campos de ícone (ausência intencional — ver Notas Técnicas).
- Não inclui: migração de qualquer outro ponto de emoji no produto além de `kpi-catalog.ts` e `atividades/page.tsx` e seus render sites diretos.
- Não inclui: alteração no componente `KpiCard` de `packages/ui` — o contrato `icon: ReactNode?` já aceita componentes Lucide sem modificação.
- Não inclui: alteração em lógica de negócio, cálculos, chamadas de API ou modelo de dados.
- Não inclui: adição de specimens novos na vitrine do design system para os ícones migrados (os ícones já têm specimen em `iconografia.tsx`).
- Não inclui: auditoria de outros emojis decorativos em comentários de código ou docstrings — escopo restrito a campos de dado funcional.

---

## Dependências

| Tipo               | Referência                                                                  | Descrição                                                                                      |
| ------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Biblioteca         | `lucide-react@^1.25.0`                                                      | Já declarada em `apps/web/package.json`; import de tipo `LucideIcon` e componentes individuais |
| Spec               | SPEC-20260525-001                                                           | Design System — Componentes UI; `KpiCard` em `packages/ui` já aceita `icon: ReactNode?`        |
| Spec               | SPEC-20260721-001                                                           | Design System — Fundamentos de Marca; define Lucide como padrão de iconografia                 |
| Análise de Impacto | IMPACTO-046                                                                 | `matrices/impacto.md` — avaliação de risco e mapeamento de módulos afetados, 2026-07-31        |
| Documento          | `specs/design-system/PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md` §8         | Seção "Iconografia e Ilustração" — regras de uso Lucide no navestory                           |
| Vitrine            | `apps/web/src/app/(app)/design-system/_components/sections/iconografia.tsx` | Specimen de referência do padrão de iconografia em produção                                    |

---

## Notas Técnicas

### Mapeamento emoji → Lucide (decisão, não TODO em aberto)

A tabela abaixo é a decisão de mapeamento adotada nesta spec. Não reabrir para discussão durante a implementação — desvios exigem atualização da spec antes de commitar.

| Emoji  | Contexto                                                  | Componente Lucide |
| ------ | --------------------------------------------------------- | ----------------- |
| 💰     | Gastos do mês (KPI)                                       | `Wallet`          |
| ⛽     | Custo/km (KPI)                                            | `Fuel`            |
| ❤️     | Saúde da frota (KPI)                                      | `HeartPulse`      |
| 🔧     | Manutenções urgentes (KPI) / Manutenção (domínio)         | `Wrench`          |
| 🚗     | Total de veículos (KPI) / Veículo (domínio)               | `Car`             |
| 📅     | Próxima manutenção (KPI)                                  | `CalendarClock`   |
| ⏳     | Próximos 7 dias (KPI)                                     | `Timer`           |
| ⚠️ / ⚠ | Anomalias de gasto (KPI) / estado "unavailable" hardcoded | `TriangleAlert`   |
| 🧾     | Despesa (domínio)                                         | `Receipt`         |
| 🚓     | Multa (domínio)                                           | `ShieldAlert`     |
| 🔁     | Custo Recorrente (domínio)                                | `Repeat`          |
| 📍     | Ciclo de Odômetro (domínio)                               | `Gauge`           |
| 👤     | Conta/usuário — domínios `auth` e `users`                 | `User`            |
| 📄     | Fallback (domínio desconhecido)                           | `FileText`        |
| 🛡️     | EmptyState de atividades                                  | `ShieldAlert`     |

### Tipagem de `LucideIcon` sem JSX no arquivo `.ts`

`LucideIcon` em `lucide-react` é um tipo TypeScript (`type LucideIcon = React.ForwardRefExoticComponent<...>`). É possível importá-lo com `import type { LucideIcon } from "lucide-react"` em arquivo `.ts` sem invocar JSX — o import de tipo é removido pelo compilador. Os componentes individuais (ex.: `Wallet`, `Fuel`) são importados normalmente nos arquivos `.tsx` que fazem o render, não no catálogo `.ts`.

**Padrão de render sugerido para `DashboardKpiGrid.tsx`:**

```tsx
// Assumindo que meta.Icon é o componente Lucide armazenado no catálogo
const Icon = meta.icon;
<Icon size={16} aria-hidden />;
```

Ou inline com a prop diretamente (TypeScript infere corretamente quando `icon: LucideIcon`):

```tsx
<meta.icon size={16} aria-hidden />
```

Verificar qual forma o linter/ESLint do projeto aceita para JSX com variável minúscula e adotar a forma consistente com o restante do código.

### Ausência de enforcement automático de emoji

Não existe ESLint rule no projeto que bloqueie automaticamente o uso de emoji em campos de tipo `LucideIcon` ou `ReactNode`. Embora tecnicamente possível (regra de `no-restricted-syntax` para literais de string com faixa Unicode de emoji em determinadas posições de AST), a relação custo/benefício foi avaliada como desfavorável: a regra seria frágil (string emoji em contextos legítimos — ex: labels de usuário, textos de UI, toasts) e exigiria manutenção contínua.

**A convenção é reforçada por:**

1. O tipo `LucideIcon` em si — TypeScript rejeita em tempo de compilação qualquer `string` atribuída ao campo após a migração.
2. Os exemplos Lucide já presentes no catálogo como referência visual para quem adicionar nova entrada.
3. Esta spec como documentação de decisão, citável em code review.

### Tamanho de ícone por contexto

| Contexto                          | Tamanho (`size` prop)                                     | Justificativa                                                          |
| --------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Cards de KPI (`DashboardKpiGrid`) | 16px                                                      | Contexto de informação densa; KpiCard já define espaço visual compacto |
| Seletor de KPI (`KpiPicker`)      | 16px                                                      | Inline com label/checkbox — ícone decorativo, não o foco               |
| Tabela de atividades              | A verificar no contexto de linha da tabela; sugerido 16px | Manter proporção com o texto da célula                                 |
| EmptyState de atividades          | 24px                                                      | Padrão do design system para empty states — é o foco visual da tela    |

---

## Decisão de Testes — Entrada Proposta em `specs/TEST_DECISIONS.md`

> Esta entrada deve ser copiada para `specs/TEST_DECISIONS.md` com status `pendente` para decisão de Douglas.

```
### SPEC-20260731-007 — Migração de Emoji para Ícones Lucide — KPI Catalog e Feed de Atividades

**Status:** pendente
**Decisão:** não requer testes
**Justificativa:** Mudança puramente visual — troca de representação de ícone sem alteração de lógica de
negócio, estrutura de componente ou contrato de API. O TypeScript valida em tempo de compilação (campo
`icon: LucideIcon` rejeita string) e o build existente (`tsc --noEmit` + `next build`) funciona como
teste de sanidade suficiente. Nenhum caso de teste existente verifica o emoji, portanto a migração
não quebra nenhuma suite. Recomendação do spec-writer: dispensar teste automatizado dedicado e validar
por revisão visual pós-implementação.
**Escopo (se aprovado):** N/A
**Decidido em:** pendente
```

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito) não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
| ---- | ----------- | ------- |
|      |             |         |
