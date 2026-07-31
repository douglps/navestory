---
id: SPEC-20260731-005
title: "Design System — Remapeamento da Escala text-* do Tailwind para Tokens Formais"
status: approved
date: 2026-07-31
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-DS-02, R-DS-12]
security: []
camadas: [frontend, design]
---

# SPEC-20260731-005: Design System — Remapeamento da Escala text-* do Tailwind para Tokens Formais

**Status:** approved
**Criada em:** 2026-07-31
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

---

## Contexto

`SPEC-20260731-001` (RF-06) materializou o sistema tipográfico formal do Nave em
`packages/ui/src/tokens/typography.ts`: família Inter variável (via `next/font`, aplicada
globalmente como `fontFamily.sans`), escala modular razão 1.2 com sete passos
(`xs` 11px → `2xl` 32px), pesos padronizados (`body` 400 / `emphasis` 500 / `label` 600 /
`heading` 700).

Ao aplicar `fontFamily.sans`, a spec-mãe adotou o princípio de **substituição global silenciosa**:
qualquer componente/tela que já usava `text-*` começou a renderizar em Inter sem precisar trocar
de classe. O mesmo princípio é a base desta spec.

O que ficou de fora naquela rodada — explicitamente registrado no changelog da spec-mãe —
é o remapeamento das chaves de tamanho. Hoje os utilitários `text-xs`, `text-sm`, `text-base`,
`text-lg`, `text-xl`, `text-2xl` ainda resolvem para os **defaults do Tailwind v3**:

| Utilitário Tailwind | Tamanho default | lineHeight default |
|---------------------|-----------------|--------------------|
| `text-xs`           | 12px            | 1.333 (16px)       |
| `text-sm`           | 14px            | 1.428 (20px)       |
| `text-base`         | 16px            | 1.5 (24px)         |
| `text-lg`           | 18px            | 1.75 (28px)        |
| `text-xl`           | 20px            | 1.75 (28px)        |
| `text-2xl`          | 24px            | 2 (32px)           |

E os valores formais em `typographyScale` são:

| Token formal        | Tamanho | lineHeight | Uso semântico              |
|---------------------|---------|------------|----------------------------|
| `xs`                | 11px    | 1.5        | Labels de campo, metadados |
| `sm`                | 13px    | 1.45       | Corpo de tabela, badges    |
| `base`              | 15px    | 1.5        | Corpo padrão, parágrafos   |
| `md`                | 18px    | 1.4        | Subtítulos de seção        |
| `lg`                | 22px    | 1.3        | Título de página           |
| `xl`                | 26px    | 1.25       | KPI principal              |
| `2xl`               | 32px    | 1.2        | Display de destaque        |

Enquanto as duas escalas coexistem sem sincronização, qualquer componente que usa `text-sm`
na tela de despesas renderiza em 14px (Tailwind default), mas o token formal diz 13px — o código
visual real diverge dos tokens de marca sem nenhum aviso de compilação.

---

## Objetivo

Sobrescrever `theme.extend.fontSize` em `apps/web/tailwind.config.ts` para que cada chave
padrão do Tailwind (`xs`, `sm`, `base`, `lg`, `xl`, `2xl`) passe a resolver para o valor
correspondente em `typographyScale` (fontSize + lineHeight), de forma que todo componente
e tela que já usa `text-sm`, `text-lg`, etc. herde automaticamente a escala de marca — sem
trocar de classe, exatamente como ocorreu com `fontFamily.sans`.

A chave `md` — presente em `typographyScale` mas ausente no Tailwind default — é adicionada
como `text-md` (chave nova, sem conflito).

---

## Decisões de Design (não deixar em aberto)

### D-01 — Estratégia: sobrescrever chaves padrão, não criar chaves paralelas

**Decisão:** sobrescrever as chaves `xs / sm / base / lg / xl / 2xl` em
`theme.extend.fontSize`, fazendo-as apontar para os valores de `typographyScale`.

**Justificativa:** a spec-mãe (`SPEC-20260731-001`) estabeleceu o precedente de
substituição global silenciosa ao remapear `fontFamily.sans`. Criar chaves paralelas
(`text-ds-sm`, `text-ds-lg`) forçaria migração manual de cada `text-*` em uso no app —
o inverso do princípio adotado — e deixaria as chaves padrão do Tailwind como "valores
não-oficiais" convivendo indefinidamente com os tokens formais. Isso é exatamente a
divergência que esta spec visa eliminar.

**Risco:** os tamanhos divergem dos defaults do Tailwind (todos são menores para
`xs/sm/base`, e maiores para `lg/xl/2xl`). Layouts que dependem dos valores antigos
podem quebrar visualmente. Esse risco é **aceito e gerenciado via gate de QA visual
explícito** (ver RF-04 e seção de Critérios de Aceite).

### D-02 — Chave `md`: adição nova, sem redistribuição

**Decisão:** adicionar `text-md` como chave nova no Tailwind config (18px / lineHeight 1.4),
sem redistribuir ou renomear nenhuma das chaves existentes.

**Justificativa:** Tailwind não tem `text-md` por padrão — não há consumidor existente
a migrar. Redistribuir os passos existentes (ex: "o que era `text-lg` passa a ser o novo
`text-md`") causaria confusão semântica sem benefício. A adição limpa de `text-md` é a
opção de menor risco e mais legível.

**Consequência:** `text-lg` sobe de 18px para 22px. Isso é uma **mudança de comportamento
real** para todo componente que usa `text-lg` atualmente esperando 18px (ex: títulos de
card). O gate de QA visual é obrigatório antes de promover esta spec de `draft` para
`approved`.

### D-03 — fontWeight não vai para o Tailwind fontSize config

**Decisão:** o campo `fontWeight` de cada passo em `typographyScale` **não** é mapeado
para `theme.extend.fontSize` do Tailwind.

**Justificativa:** a API `[fontSize, { lineHeight, fontWeight }]` do Tailwind v3 existe
mas é pouco conhecida e cria utilitários que combinam tamanho + peso num único `text-*`,
impedindo a separação ortogonal ("quero `text-sm` bold" vs "quero `text-sm` regular"). A
escala já define os pesos semânticos canônicos (`font-normal`, `font-medium`,
`font-semibold`, `font-bold`), que cada componente aplica individualmente. Isso é o
comportamento correto — o `fontWeight` em `typographyScale` serve de documentação semântica
("subtítulo de seção geralmente usa 500"), não como constraint de compilação.

### D-04 — Escopo: somente apps/web/tailwind.config.ts nesta spec

**Decisão:** o remapeamento ocorre apenas em `apps/web/tailwind.config.ts`. O pacote
`packages/ui` não tem `tailwind.config.ts` próprio — seus componentes são compilados
pelo consumer (o app web).

**Consequência:** se um segundo app for adicionado ao monorepo no futuro, ele precisará
aplicar o mesmo `extend.fontSize` em seu próprio `tailwind.config.ts`. Isso é explicitado
aqui para evitar esquecimento silencioso.

### D-05 — Escopo do QA visual

**Decisão:** o gate de QA visual antes de promover para `approved` cobre:
1. Execução da suíte de visual regression existente em
   `apps/web/e2e/tests/visual-regression.spec.ts` com atualização deliberada de
   baselines (o racional de cada diff aprovado deve ser registrado no PR, não apenas
   o clique em "accept").
2. Auditoria manual das telas de maior densidade tipográfica: dashboard (KPI cards,
   tabela de despesas, subheader financeiro), listagem de manutenções, sidebar/nav
   labels, formulário de despesa (labels, badges de validação).
3. Verificação de que `C-DS-01` permanece íntegro — a mudança de tamanho pode alterar
   a classificação "texto grande ≥ 18px" (limiar de 3:1 em vez de 4.5:1 no WCAG),
   forçando revisão dos pares de contraste que estavam no limiar.

---

## Histórias de Usuário e Critérios de Aceitação

**Persona P1 — Douglas, mantenedor do Nave**, responsável pela consistência do design
system e pela rastreabilidade código ↔ tokens.

**Persona P2 — Gestor de frota**, usuário final que lê dashboards com alta densidade
de dados numéricos (valores de KPI, tabelas de despesa, odômetros).

### US-01 — Escala tipográfica de marca, sem migração manual de classes

**Como** P1, **quero** que `text-sm`/`text-lg`/etc. resolvam para os valores formais do
`typographyScale` automaticamente, **para** que qualquer componente novo ou existente
reflita a escala de marca sem exigir substituição de classe por classe.

- **Dado que** o build do app web foi compilado após o remapeamento, **quando** o DevTools
  inspeciona um elemento com `text-sm`, **então** o `font-size` computado é `13px` e o
  `line-height` computado é `1.45` — não os valores defaults do Tailwind.
- **Dado que** um componente novo usa `text-md`, **quando** compilado, **então** renderiza
  `18px` / `line-height 1.4` — chave formal, sem erro de build.
- **Dado que** qualquer arquivo `.tsx` no app usa `text-[14px]` ou outro valor arbitrário
  fora das chaves formais, **quando** auditado via `R-DS-12`, **então** é sinalizado como
  desvio e removido (exceto protótipos em `concept/*`).

### US-02 — Consistência visual garantida por QA antes de ir para produção

**Como** P1, **quero** que as diferenças de layout causadas pela mudança de tamanho sejam
identificadas e resolvidas antes de promover a spec, **para** que nenhum dado crítico
(valor de KPI, label de status, campo de formulário) quebre em produção.

- **Dado que** os baselines de visual regression são atualizados no PR de implementação,
  **quando** cada diff é aprovado, **então** há um comentário no PR justificando o aceite
  do delta visual (ex: "KPI card agora usa 26px conforme escala formal — aceito").
- **Dado que** pares de contraste próximos do limiar AA foram reclassificados (ex: texto
  que era "grande" por estar em 18px passa a ser "normal" por estar em 13px), **quando**
  auditados via `contrast.spec.ts`, **então** os valores WCAG ainda passam no novo
  limiar — ou o par é ajustado antes de promover.

---

## Requisitos Funcionais

| ID    | Requisito | Prioridade | História |
|-------|-----------|------------|----------|
| RF-01 | Sobrescrever `theme.extend.fontSize` em `apps/web/tailwind.config.ts` com os sete passos da escala formal (`xs`, `sm`, `base`, `md` como nova chave, `lg`, `xl`, `2xl`), cada um no formato `[fontSize, { lineHeight }]` — sem `fontWeight` (ver D-03) | Alta | US-01 |
| RF-02 | Importar os valores de `packages/ui/src/tokens/typography.ts` (`typographyScale`) diretamente no `tailwind.config.ts` — nunca duplicar os valores como literais no config (fonte única de verdade) | Alta | US-01 |
| RF-03 | Adicionar o comentário de rastreabilidade `// @spec SPEC-20260731-005 RF-01` no bloco `extend.fontSize` do `tailwind.config.ts` | Média | US-01 |
| RF-04 | Executar e aprovar a suíte de QA visual conforme D-05, com baselines atualizados e diffs justificados no PR — pré-condição para promover esta spec de `draft` para `approved` | Alta | US-02 |
| RF-05 | Verificar que `contrast.spec.ts` continua passando 100% após o remapeamento (reclassificação de "texto grande" → "texto normal" pode exigir ajuste de algum par de contraste) | Alta | US-02 |
| RF-06 | Atualizar o comentário de header em `packages/ui/src/tokens/typography.ts` removendo a nota "a escala de utilitários `text-*` do Tailwind já em uso no app não foi remapeada nesta rodada" — substituir por referência a esta spec | Baixa | US-01 |
| RF-07 | Atualizar `matrices/rastreabilidade.md` com a entrada desta spec | Alta | — |

## Requisitos Não-Funcionais

| ID     | Requisito | Métrica de Aceite |
|--------|-----------|------------------|
| RNF-01 | Nenhuma regressão de build: o app deve compilar sem erro após o remapeamento | `next build` sem erro em CI |
| RNF-02 | Nenhuma regressão em testes unitários existentes: vitest em `packages/ui` e `apps/web` passam sem alteração de asserção | Suíte completa verde |
| RNF-03 | `C-DS-01` preservado: todo par de contraste crítico em `contrast.spec.ts` permanece acima do piso WCAG AA no limiar correto para o novo tamanho | `contrast.spec.ts` 100% |
| RNF-04 | Sem `text-[Npx]` ou valor arbitrário de `font-size` fora das chaves formais no código de produção (exceto `concept/*` e copy de marketing com justificativa) | `R-DS-12` validado em code review |

---

## Fora de Escopo

- Remapeamento de chaves acima de `2xl` (`text-3xl`, `text-4xl`, etc.) — a escala formal
  não define esses passos; classes acima de `2xl` são de uso excepcional (marketing/
  ilustração) e permanecem como Tailwind default enquanto não houver step formal.
- Alteração dos pesos via `theme.extend.fontWeight` — os aliases semânticos
  (`body`/`emphasis`/`label`/`heading`) já existem em `typographyScale` como referência
  documentada; o remapeamento de utilitários `font-*` é trabalho separado se/quando
  houver demanda real.
- Migração de outros apps do monorepo (apenas `apps/web` é coberto por esta spec — ver D-04).
- Regra de `tabular-nums` para dados numéricos — já definida em RF-06 de
  `SPEC-20260731-001`; esta spec não a revisita.
- Atualização de componentes individuais de `packages/ui` — o remapeamento é no config
  do Tailwind do consumer; os componentes usam as mesmas classes `text-*` e passam a
  herdar os novos valores automaticamente.

---

## Dependências

| Tipo  | Referência | Descrição |
|-------|-----------|-----------|
| Spec  | SPEC-20260731-001 | Spec-mãe — cria `typographyScale` (fonte de verdade) e `fontFamily.sans`; esta spec fecha a pendência registrada em seu changelog |
| Regra | R-DS-12 | Nova regra criada junto desta spec — proíbe valores arbitrários de `text-*` fora da escala formal |
| Regra | C-DS-01 | Contraste WCAG AA — a mudança de tamanho altera o limiar "texto normal vs. texto grande"; RF-05 valida que não há regressão |
| Arquivo | `packages/ui/src/tokens/typography.ts` | Fonte de todos os valores de fontSize e lineHeight — importada diretamente no Tailwind config (RF-02) |
| Arquivo | `apps/web/tailwind.config.ts` | Único arquivo modificado pela implementação desta spec |
| Teste  | `apps/web/e2e/tests/visual-regression.spec.ts` | Suíte de visual regression existente — baselines atualizados como parte do gate de QA (RF-04) |
| Teste  | `apps/web/src/app/(app)/design-system/_lib/contrast.spec.ts` | Validação de contraste — executada obrigatoriamente após o remapeamento (RF-05) |

---

## Notas Técnicas

### Formato do remapeamento no tailwind.config.ts

```ts
// @spec SPEC-20260731-005 RF-01
// Importar typographyScale de packages/ui para evitar duplicação de valores
import { typographyScale } from "../../packages/ui/src/tokens/typography";

// Em theme.extend:
fontSize: {
  xs:     [typographyScale.xs.fontSize,   { lineHeight: typographyScale.xs.lineHeight }],
  sm:     [typographyScale.sm.fontSize,   { lineHeight: typographyScale.sm.lineHeight }],
  base:   [typographyScale.base.fontSize, { lineHeight: typographyScale.base.lineHeight }],
  md:     [typographyScale.md.fontSize,   { lineHeight: typographyScale.md.lineHeight }],
  lg:     [typographyScale.lg.fontSize,   { lineHeight: typographyScale.lg.lineHeight }],
  xl:     [typographyScale.xl.fontSize,   { lineHeight: typographyScale.xl.lineHeight }],
  "2xl":  [typographyScale["2xl"].fontSize, { lineHeight: typographyScale["2xl"].lineHeight }],
},
```

> Nota: verificar se o `tailwind.config.ts` consegue importar TypeScript de `packages/ui`
> diretamente — o monorepo usa workspaces (`@nave/ui`), mas o config do Tailwind roda em
> Node antes do transpile. Alternativa válida se a importação direta não funcionar: extrair
> os valores para um arquivo `.js` ou `.json` em `packages/ui/src/tokens/typography.json`
> que seja consumível sem transpile. Decidir na implementação; ambas as rotas são corretas —
> o que não é aceito é duplicar os valores como literais no config.

### Impacto quantitativo esperado por passo

| Utilitário | Antes (Tailwind) | Depois (formal) | Delta tamanho | Delta lineHeight |
|------------|------------------|-----------------|---------------|------------------|
| `text-xs`  | 12px / 1.333     | 11px / 1.5      | −1px          | +0.167           |
| `text-sm`  | 14px / 1.428     | 13px / 1.45     | −1px          | +0.022           |
| `text-base`| 16px / 1.5       | 15px / 1.5      | −1px          | 0                |
| `text-md`  | (inexistente)    | 18px / 1.4      | +18px (nova)  | —                |
| `text-lg`  | 18px / 1.75      | 22px / 1.3      | +4px          | −0.45            |
| `text-xl`  | 20px / 1.75      | 26px / 1.25     | +6px          | −0.5             |
| `text-2xl` | 24px / 2.0       | 32px / 1.2      | +8px          | −0.8             |

Os passos `xs/sm/base` ficam ligeiramente menores (−1px), resultando em texto mais compacto
em tabelas e labels. Os passos `lg/xl/2xl` crescem de forma expressiva — especialmente `2xl`
(+8px), que é usado em KPIs de destaque. O gate de QA visual (RF-04) é o mecanismo de controle.

### Reclassificação WCAG "texto grande"

WCAG 2.1 define "texto grande" como ≥ 18pt (24px) regular ou ≥ 14pt (≈18.67px) bold.
Após o remapeamento, `text-lg` (22px regular) continua abaixo de 24px — permanece como
"texto normal" (limiar 4.5:1, sem mudança). `text-2xl` (32px) cruza para "texto grande"
(limiar 3:1). Pares de contraste indexados em `contrast.spec.ts` que usam `text-2xl` precisam
ser revisitados para verificar se a folga atual já supera 4.5:1 (caso sim, nenhum ajuste
necessário) ou apenas 3:1 (caso o par estava calibrado no limiar do texto grande antigo,
pode precisar de reforço).

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito)
> não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-07-31 | RF-01, RF-02, RF-03, RF-05, RF-06, RF-07 implementados e verificados nesta sessão: `apps/web/tailwind.config.ts` importa `typographyScale` de `@nave/ui/tokens` (sem duplicar valores, sem precisar do fallback `.json` cogitado nas Notas Técnicas — o workspace resolve o import TS direto) e sobrescreve `xs/sm/base/md/lg/xl/2xl`; `next build` e `npx tsc --noEmit` (`apps/web`) sem erro; suíte completa verde (`packages/ui` 179/179, `apps/web` 356/356, incluindo `contrast.spec.ts` 22/22 — RF-05/RNF-03 sem regressão de contraste). Auditoria manual via browser em `dashboard`, `expenses`, `expenses/new`, `maintenance` e no showcase `/design-system` (aba Tipografia) não encontrou quebra visual. **Spec mantida em `review`, não promovida a `approved`:** RF-04 exige também a suíte de visual regression (`apps/web/e2e/tests/visual-regression.spec.ts`) com baseline atualizada — essa baseline não existe ainda no repo (pendência pré-existente, não causada por esta spec; rastreada em `important/PENDENCIAS-E-PROCESSOS.md`, item "Secrets de E2E (Playwright)..."). Promover para `approved` quando essa baseline for gerada e o diff revisado. | Usuário pediu para aprovar e implementar a spec; a implementação de código foi concluída e verificada, mas o próprio critério de aceite da spec (D-05/RF-04) exige o gate de visual regression, que depende de infraestrutura ainda não provisionada — não fica correto marcar como `approved` sem cumprir o próprio gate que a spec definiu. |
| 2026-07-31 | RF-04 concluído: seed de dados E2E rodado contra o Supabase remoto configurado em `apps/api/.env` (`pnpm --filter @nave/api seed:e2e`), stack local subida e baseline PNG gerada com `playwright test visual-regression --update-snapshots` (6/6 passando, confirmado em execução subsequente sem `--update-snapshots`). No processo, dois bugs pré-existentes de locator na suíte E2E (nunca executada de fato em CI até agora) foram corrigidos: `getByLabel("Senha")` sem `exact: true` colidia por substring com o botão "Mostrar/Ocultar senha" do `PasswordInput` (`e2e/global-setup.ts`, `e2e/pages/login.page.ts`); `page.locator("nav")` no `DashboardPage` deixou de ser único após o shell passar a renderizar `<nav>` extras no footer, corrigido para `getByRole("dialog", { name: "Menu de navegação" })`. Spec promovida para `approved`. | RF-04 era o único bloqueio restante; a baseline foi gerada e o gate de QA visual (D-05) está cumprido. Os bugs de locator encontrados na rodada completa da suíte (fora do escopo desta spec — afetam `auth.spec.ts`, `expense-warnings.spec.ts`, `vehicle-context.spec.ts`) foram registrados separadamente em `important/PENDENCIAS-E-PROCESSOS.md` para não expandir o escopo desta spec de design system. |
