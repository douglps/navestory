---
id: SPEC-20260731-001
title: "Design System — Adoção da Direção Azul-Índigo como Identidade de Marca"
status: approved
date: 2026-07-31
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-DS-05, R-DS-11, C-DS-01, C-DS-02]
security: []
camadas: [frontend, design]
---

# SPEC-20260731-001: Design System — Adoção da Direção Azul-Índigo como Identidade de Marca

**Status:** approved
**Criada em:** 2026-07-31
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

---

## Contexto

O Nave tinha "Prata" (`ADR-009`, `SPEC-20260729-001`) como identidade de marca em produção — azul-prata-cinza validado por pesquisa de psicologia das cores (Heller). Uma rodada de pesquisa de mercado (fintech: Nubank, Monzo, Mercury; mobilidade/frota: Samsara, Motive) identificou que Prata, apesar de correta ergonomicamente, reforça o padrão quase universal de azul naval/acromático da categoria de frota — sem diferenciação — e carrega frieza emocional num produto que lida com momentos de estresse financeiro do usuário.

O usuário aprovou, em 2026-07-30, a substituição por **Azul-Índigo** (H≈250°) como nova direção de marca, junto de uma definição completa e madura do design system ao redor dela: tipografia (inexistente formalmente hoje), arquitetura de tokens em 3 camadas, matriz de estados de componente, elevação/superfícies, iconografia, motion, acessibilidade e voz de marca — documentado em `specs/design-system/PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md`.

Diferente da adoção de Prata (definição e migração de tokens na mesma sessão), esta spec nasce como a etapa de **formalização/definição** — a migração de tokens de produção é trabalho subsequente, rastreado abaixo como requisitos com implementação pendente. Ver `ADR-011` para o racional arquitetural completo da decisão.

---

## Objetivo

Formalizar como requisitos rastreáveis o "Plano de Adoção" da proposta aprovada: (1) conversão OKLCH e migração de tokens de produção para Azul-Índigo/grafite; (2) atualização de `specs/RULES.md` e das matrizes; (3) atualização de `/Design.md`; (4) fechamento de `C-DS-01` e da nova `C-DS-02`; (5) formalização do sistema tipográfico e da arquitetura de tokens em 3 camadas.

---

## Material de Referência (não duplicar aqui)

| Documento | Conteúdo | Caminho |
|-----------|----------|---------|
| ADR-011 | Racional completo da decisão, trade-offs e consequências | `docs/architecture/decisions/ADR-011-adocao-direcao-azul-indigo.md` |
| PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md | Pesquisa de mercado, paleta tonal completa (12 tons + grafite), tipografia, arquitetura de tokens, matriz de estados de componente, elevação, iconografia, motion, acessibilidade, voz de marca, governança | `specs/design-system/PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md` |
| Design System Showcase | Componentes reais de `@nave/ui`, re-temizados localmente — base e prova de contraste para a migração de tokens | `apps/web/src/app/(app)/design-system/` |
| ADR-009 / SPEC-20260729-001 | Decisão/spec substituídas por esta | `docs/architecture/decisions/ADR-009-adocao-direcao-prata.md`, `specs/design-system/SPEC-20260729-001-adocao-direcao-prata.md` |

---

## Histórias de Usuário e Critérios de Aceitação

**Persona P1 — Douglas, mantenedor do Nave**, responsável pela identidade visual e consistência do design system.
**Persona P2 — Gestor de frota**, usuário final que consome dashboards densos de dados por longos períodos, em light e dark mode, em rotina tranquila e em momentos de estresse financeiro/operacional.

### US-01 — Identidade de marca diferenciada da categoria de frota

**Como** P1, **quero** que a paleta de produção reflita Azul-Índigo (H≈250) em vez do azul-prata acromático de Prata, **para** que o Nave deixe de ocupar o mesmo espaço visual que a concorrência de frota (Samsara, Motive) e ganhe reconhecimento de marca próprio.

- **Dado que** o tema light está ativo, **quando** `--primary`/`--primary-foreground` são renderizados, **então** correspondem aos valores OKLCH convertidos de Azul-Índigo (`~44% 0.19 250` light, `~66% 0.16 250` dark — valores de partida da proposta, sujeitos a ajuste fino na conversão formal de RF-01).
- **Dado que** o tema dark está ativo, **quando** `--background` é renderizado, **então** corresponde ao grafite dedicado (`≈#13131A`), independente da família de `--primary` — nunca um tom escurecido do próprio azul.
- **Dado que** `--gold` (acento) e `--danger`/`--success` são consultados, **quando** renderizados, **então** permanecem inalterados em relação a Prata — nenhum destes tokens é tocado por esta adoção.

### US-02 — Ouro como segunda cor de marca (Barroco Mineiro)

**Como** P1, **quero** um `--secondary` estrutural (bronze/ouro-velho) distinto do `--gold` de brilho existente, **para** ter uma segunda cor de marca com presença em elementos de maior área (botão secundário, divisor), sem competir com o acento pontual.

- **Dado que** `--secondary` é aplicado a um botão secundário ou divisor, **quando** renderizado ao lado de `--gold`, **então** as duas variantes de ouro nunca aparecem lado a lado na mesma composição (regra herdada do acento único de Prata).
- **Dado que** `--secondary` é consultado hoje, **quando** nenhum componente de `packages/ui` o consome (a confirmar por grep antes da migração, mesmo procedimento de `SPEC-20260729-001` US-01), **então** o novo valor bronze não produz regressão visual observável.

### US-03 — Tokens pastel legíveis em dark mode (C-DS-02)

**Como** P2, **quero** que texto sobre `Alert`/`Badge`/`Toast` com fundo `*-pastel` seja legível em dark mode, **para** não perder informação de status (sucesso/erro/aviso/info) justamente nos componentes que a comunicam.

- **Dado que** o tema dark está ativo, **quando** `successPastel`/`warningPastel`/`dangerPastel`/`infoPastel` são renderizados como fundo de `text-foreground`, **então** cada um tem override próprio em `darkColorChannels` (hoje ausente — caem no valor claro do light mode) com contraste ≥ 4.5:1 contra `--foreground` em dark.
- **Dado que** `C-DS-01`/`C-DS-02` são auditados, **quando** medidos no showcase e em produção, **então** os valores batem (o showcase já validou ~13:1 com valores dark inéditos, conforme changelog da proposta de 2026-07-30).

### US-04 — Sistema tipográfico formal para dado denso

**Como** P2, **quero** que valores numéricos (KPI, tabela, odômetro, moeda) usem algarismos tabulares, **para** que listas de valores fiquem alinhadas verticalmente em vez de "dançar" com fontes de largura proporcional.

- **Dado que** uma célula de tabela, KPI, contador, valor monetário ou leitura de odômetro é renderizada, **quando** inspecionada, **então** declara `font-variant-numeric: tabular-nums`.
- **Dado que** a família tipográfica é aplicada, **quando** carregada, **então** usa Inter variável (pesos 400/500/600/700), nunca a fonte default do sistema operacional por omissão.

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | História relacionada |
|----|-----------|------------|----------------------|
| RF-01 | Conversão OKLCH completa do Azul-Índigo (primary, tonal scale de 12 tons) e do grafite dedicado (light/dark), com `contrastExpectations` documentado e validação `jest-axe` — mesmo processo de `SPEC-20260729-001` | Alta | US-01 |
| RF-02 | Migrar em `packages/ui/src/tokens/colors.ts` (`colorChannels`/`darkColorChannels`) e `apps/web/src/app/globals.css` (`:root`/`.dark`): `primary`, `primaryForeground`, `background`, `foreground`, `card`, `cardForeground`, `border`, `muted`, `secondary` (bronze), `secondaryForeground` — `gold`, `danger`, `success`, `warning`, `info` permanecem intocados. Escopo ampliado em relação à redação original desta linha: como o grafite é uma família neutra própria (não só o `background` de dark), `foreground`/`card`/`cardForeground`/`border`/`muted` migram junto em ambos os temas | Alta | US-01, US-02 |
| RF-03 | Adicionar os quatro overrides ausentes de dark mode (`successPastel`, `warningPastel`, `dangerPastel`, `infoPastel`) em `darkColorChannels`, fechando `C-DS-02` | Alta | US-03 |
| RF-04 | Documentar formalmente em `--warning`/`--success` (comentário no token ou `Design.md`) o contrato "uso apenas sobre o próprio `-pastel`, nunca texto direto sobre o canvas", fechando `C-DS-01` conforme item pendente já sinalizado em `RULES.md` | Alta | US-03 |
| RF-05 | Atualizar `/Design.md` (raiz do repo) — hoje referencia "Steel & Sapphire" desatualizado — para refletir Azul-Índigo como base final, seguindo a estrutura de seções de `R-DS-02` | Média | US-01 |
| RF-06 | Adicionar sistema tipográfico formal (Inter variável, escala modular razão 1.2, `--text-xs` a `--text-2xl`) em `packages/ui/src/tokens/` e regra de `tabular-nums` para dado numérico | Média | US-04 |
| RF-07 | Atualizar `matrices/rastreabilidade.md` com a linha desta spec (requisito → spec → código → teste, código/teste `pendente` até RF-01/RF-02/RF-03 serem implementados) | Alta | — |
| RF-08 | Marcar `SPEC-20260729-001` como `deprecated`, `superseded_by: SPEC-20260731-001` | Alta | US-01 |

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Nenhuma regressão nas suítes existentes (`packages/ui`, `apps/web`) após a migração de RF-02 | Suítes `vitest` completas passam sem alteração de asserção, incluindo `jest-axe` |
| RNF-02 | Contraste AA preservado (`C-DS-01`) para `primary`/`primaryForeground`/`secondary`/`secondaryForeground` em ambos os temas | Razão de contraste ≥ 4.5:1, validada via `contrastExpectations` |
| RNF-03 | `successPastel`/`warningPastel`/`dangerPastel`/`infoPastel` atingem ≥ 4.5:1 contra `--foreground` em dark mode (`C-DS-02`) | Medido no showcase e replicado em produção após RF-03 |

---

## Fora de Escopo

- Migração do símbolo/logotipo do Nave ("Estrela-Rosácea") — coberta em `PROPOSTA-BRAND-PLATAFORMA-2026-07-30.md` e `HANDOFF-SIMBOLO-EQUIPE-DESIGN-2026-07-31.md`, spec própria futura.
- Migração de `--surface`/`--on-surface`/`--chart-*`/`--finance-outgoing` (tokens do dashboard v2, `SPEC-20260721-002`) — já estava fora de escopo em `SPEC-20260729-001` e continua não realinhada.
- Matriz de estados de componente completa (§6 da proposta) e elevação/superfícies (§7) como documentação formal em `Design.md`/showcase — descritas na proposta, mas não viram requisito funcional nesta rodada; ficam como trabalho de uma spec de componente futura se/quando `packages/ui` expandir.
- Migração de `--warning` de H≈85 para H≈48 (derivado do ouro) — avaliação futura explicitamente não-bloqueante na proposta (§3.3).
- Fluxo de proposta/aprovação de token novo (§12 da proposta) como processo de PR — já é prática do projeto via revisão de PR; não precisa de requisito funcional dedicado.

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| ADR | ADR-011 | Decisão arquitetural completa |
| Spec | SPEC-20260729-001 | Deprecated, superseded_by esta spec |
| Spec | SPEC-20260721-001 | Mecanismo de tokens/dark mode/contraste — reutilizado sem alteração |
| Spec | SPEC-20260729-002 | R-DS-07/R-DS-08 (paleta categórica, escala de urgência) — inalteradas, sem conflito com Azul-Índigo |
| Regra | C-DS-01 | Contraste WCAG AA mínimo — fechamento formal via RF-04 |
| Regra | R-DS-11 | Nova regra de uso de degradê (ver `RULES.md`) |
| Doc | PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md | Fonte de todos os valores e racional — não duplicado nesta spec |

---

## Notas Técnicas

**Correção de numeração de regra:** a proposta original (§3.6) propõe a nova regra de degradê como "`R-DS-08`". Esse ID já está em uso (`R-DS-08` = escala de urgência/intensidade, `SPEC-20260729-002`) — a regra de degradê desta spec é registrada como **`R-DS-11`** (próximo ID livre da série `R-DS`, que vai até `R-DS-10`). O texto da proposta aprovada não foi editado retroativamente (documento de definição já aprovado por Douglas); esta nota apenas documenta a correção aplicada no `RULES.md` real.

**Valores de partida para RF-01 (não finais — ponto de partida para a conversão OKLCH formal):**

| Token | Light OKLCH (partida) | Dark OKLCH (partida) |
|---|---|---|
| primary | `~44% 0.19 250` | `~66% 0.16 250` |
| secondary (bronze) | `~48% 0.10 82` | `~62% 0.09 82` |
| background (dark) | — | grafite `≈#13131A` (`graphite-10`) |

Ver §3.5 e §3.3 de `PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md` para a escala tonal completa (12 tons) e a tabela de reorganização de cores derivadas.

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito) não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-07-31 | RF-01 a RF-08 implementados e spec promovida de `draft` para `approved` na mesma sessão (mesmo padrão de `SPEC-20260729-001`/Prata). Escopo de RF-02 ampliado (ver nota na própria linha) — o grafite dedicado se aplica a `foreground`/`card`/`cardForeground`/`border`/`muted`, não só `background`. `dangerForeground` foi mantido no valor literal de Prata (fora do escopo de migração): trocar para o novo `background` derrubava o contraste `danger`/`danger-foreground` abaixo do piso AA (confirmado por `contrast.spec.ts`). RF-06 (tipografia): Inter aplicada em produção e tokens formais criados, mas a escala de utilitários `text-*` do Tailwind não foi remapeada — fora de escopo, exige QA visual completa. RNF-01 confirmado sem regressão nova (`packages/ui` 179/179, `apps/web` 349/351 — as 2 falhas restantes são pendência pré-existente de `warning`, não introduzida por esta spec). | Usuário pediu para prosseguir com a implementação completa do Plano de Adoção após a formalização inicial (ADR-011 + spec em `draft`). |
