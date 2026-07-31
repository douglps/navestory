---
id: SPEC-20260729-001
title: "Design System — Adoção da Direção Prata como Identidade de Marca"
status: deprecated
superseded_by: SPEC-20260731-001
date: 2026-07-29
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-DS-05, R-DS-06, C-DS-01]
security: []
camadas: [frontend, design]
---

# SPEC-20260729-001: Design System — Adoção da Direção Prata como Identidade de Marca

**Status:** deprecated (superseded_by [SPEC-20260731-001](SPEC-20260731-001-adocao-direcao-azul-indigo.md))
**Criada em:** 2026-07-29
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

---

## Contexto

O showcase de direções de marca (`apps/web/src/app/(app)/brand-showcase/`) explorou seis direções visuais para o Nave. A direção **Prata** se diferenciou por ser construída sobre pesquisa empírica de psicologia das cores (Eva Heller, *A Psicologia das Cores* — ~2.000 pessoas pesquisadas na Alemanha) em vez de tendência de mercado: o acorde azul-prata-cinza é descrito na pesquisa como "a cor da tecnologia e da funcionalidade", diretamente alinhado ao perfil de produto do Nave (SaaS B2B de gestão de frota, dashboards densos de dados, "Calm UI" anti-fadiga).

Uma sessão de revisão do showcase Prata corrigiu três bugs/decisões antes desta adoção:

1. Texto colorido com a mesma variável CSS usada como extremo do próprio gradiente de fundo (`GlassPanel`, `PrataGlassSection`) — ilegível em ambos os temas onde o card caía perto desse extremo.
2. Badge dourado com texto que invertia de cor no dark mode (`var(--bs-anchor)`) sobre um dourado que continua claro no dark mode — texto claro sobre fundo claro.
3. Vermelho de alerta saturado demais, competindo com o ouro; substituído por terracota dessaturado.
4. Composição majoritariamente colorida (gradiente cobrindo ~100% de uma seção, atrás de texto) — corrigida com a regra 60-30-10 (proporção e distribuição de cor) trazida pelo usuário.

O usuário decidiu adotar Prata como identidade de marca oficial do Nave — substituindo "Steel & Sapphire" (`SPEC-20260721-001`, `SPEC-20260722-001`) — e migrar os tokens de produção (`packages/ui/src/tokens/colors.ts`, `apps/web/src/app/globals.css`) nesta mesma rodada, não como trabalho futuro.

Ver [ADR-009](../../docs/architecture/decisions/ADR-009-adocao-direcao-prata.md) para o racional completo da decisão arquitetural.

---

## Objetivo

Formalizar como requisitos rastreáveis: (1) a substituição da paleta de marca de produção pelos valores da direção Prata; (2) a revisão de `R-DS-05` (proporção cromática) de 70/15/10/5 para 60-30-10; (3) a nova regra `R-DS-06` (terracota como único tom de `danger`, nunca sobre fundo direto do tema).

---

## Material de Referência (não duplicar aqui)

| Documento | Conteúdo | Caminho |
|-----------|----------|---------|
| ADR-009 | Racional completo da decisão, trade-offs e consequências | `docs/architecture/decisions/ADR-009-adocao-direcao-prata.md` |
| Direção Prata (fonte) | Paleta hex, rationale, `contrastExpectations`, guidelines | `apps/web/src/app/(app)/brand-showcase/_data/directions.ts` |
| Inventário do Design System | Estado atual de tokens e componentes em `packages/ui` | `specs/design-system/INVENTARIO-DESIGN-SYSTEM.md` |

---

## Histórias de Usuário e Critérios de Aceitação

**Persona P1 — Douglas, mantenedor do Nave**, responsável pela identidade visual e consistência do design system.
**Persona P2 — Gestor de frota**, usuário final que consome dashboards densos de dados por longos períodos, em light e dark mode.

### US-01 — Identidade de marca com racional empírico, não estético

**Como** P1, **quero** que a paleta de produção reflita a direção Prata (validada por pesquisa de psicologia das cores), **para** ter uma base defensável para decisões de cor futuras, em vez de preferência estética não-verificável.

- **Dado que** o tema light está ativo, **quando** `--background`, `--foreground`, `--card`, `--border`, `--muted`, `--primary` ou `--gold` são renderizados, **então** correspondem aos valores OKLCH convertidos da direção Prata (ver tabela de conversão em Notas Técnicas).
- **Dado que** o tema dark está ativo, **quando** os mesmos tokens são renderizados, **então** correspondem à variante dark de Prata, sem lógica condicional de cor em componentes (`RNF-01` de `SPEC-20260721-001`, inalterado).
- **Dado que** `--secondary` é consultado, **quando** nenhum componente de `packages/ui` o consome (confirmado por grep antes desta spec), **então** seu novo valor (tom estrutural derivado da mesma família de `--primary`) não produz nenhuma regressão visual observável.

### US-02 — Alerta sem competir com o destaque de marca

**Como** P2, **quero** que o vermelho de erro/perigo não "grite" mais do que o dourado de marca, **para** que o destaque visual da tela continue sinalizando o que é realmente excepcional (não confundir "erro comum" com "destaque de marca").

- **Dado que** um componente usa `--danger` (ou `--finance-outgoing`), **quando** renderizado, **então** exibe o terracota dessaturado (H≈32, C≈0.14), nunca o vermelho saturado anterior (H=25, C=0.2).
- **Dado que** `--danger` é usado como cor de texto/ícone, **quando** medido, **então** aparece sobre `--danger-pastel` (nunca direto sobre `--background`/`--card` do tema ativo) — mesmo padrão já usado por `success`/`warning`/`info` (ver changelog de `SPEC-20260721-001`, correção do `KpiCard`).

### US-03 — Proporção cromática 60-30-10 como heurística de revisão

**Como** P1, **quero** uma referência de proporção mais rigorosa (60% neutro / 30% estrutural / 10% acento) do que a anterior (70/15/10/5), **para** evitar composições que "lavem" a tela inteira em cor, mesmo sem lint automatizado.

- **Dado que** uma tela nova é revisada (`reviewer`/`design-system`), **quando** a composição de cor é avaliada, **então** usa a proporção 60-30-10 de `R-DS-05` v2 como referência — não v1 (70/15/10/5).
- **Dado que** `SPEC-20260722-001` cita `R-DS-05` sem versão travada, **quando** a regra é revisada, **então** a spec herda v2 automaticamente, sem necessidade de edição própria (mecanismo de versionamento de regra do projeto).

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | História relacionada |
|----|-----------|------------|----------------------|
| RF-01 | Substituir em `packages/ui/src/tokens/colors.ts` (`colorChannels`/`darkColorChannels`) e `apps/web/src/app/globals.css` (`:root`/`.dark`) os valores de `background`, `foreground`, `card`, `cardForeground`, `border`, `muted`, `mutedForeground`, `primary`, `primaryForeground`, `secondary`, `secondaryForeground`, `gold`, `goldForeground`, `danger`, `dangerForeground`, `dangerPastel` pelos equivalentes OKLCH da direção Prata | Alta | US-01, US-02 |
| RF-02 | Registrar em `specs/RULES.md` a revisão de `R-DS-05` (v1→v2, 60-30-10) e a criação de `R-DS-06` (terracota único tom de `danger`, nunca sobre fundo direto) | Alta | US-02, US-03 |
| RF-03 | Marcar `SPEC-20260722-002` (canvas quente) como `deprecated`, `superseded_by: SPEC-20260729-001` | Alta | US-01 |

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Nenhuma regressão em `packages/ui` e `apps/web` | Suítes `vitest` completas de ambos os pacotes (141 + 329 testes, incl. `jest-axe`) passam sem alteração de asserção |
| RNF-02 | Contraste AA preservado (`C-DS-01`) mesmo com `mutedForeground` acima do teto de L=42% documentado em `SPEC-20260721-001` RF-02 | Razão de contraste `mutedForeground`/`background` ≥ 4.5:1 em ambos os temas (validada analiticamente via `contrastExpectations` da direção Prata: ~5.2:1 light, ~6.8:1 dark) |

---

## Fora de Escopo

- Varredura de cor hardcoded fora do sistema de tokens (hex literal, gradientes ad hoc em telas específicas) — não solicitada nesta rodada; ver ADR-009, "Trade-offs aceitos".
- `--surface`/`--surface-elevated`/`--on-surface*`/`--chart-*`/`--finance-outgoing` (tokens introduzidos por `SPEC-20260721-002`, dashboard v2) — pertencem a uma spec de feature distinta, não à identidade de marca; ficam temporariamente fora de alinhamento com a nova paleta.
- `accent` (verde, H=140), `success`, `warning`, `info` — semântica de status ortogonal à identidade de marca; Prata não redefine esses papéis.
- Reforço artificial de chroma em `primary` dark mode para uso como CTA/botão — mantida a fidelidade ao valor validado na paleta Prata, mesmo sendo mais discreto que o azul vívido anterior (ver ADR-009, "Dificulta").

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260721-001 | Mecanismo de tokens/dark mode/contraste — reutilizado sem alteração |
| Spec | SPEC-20260722-001 | R-DS-05 revisado (v1→v2); demais requisitos inalterados |
| Spec | SPEC-20260722-002 | Deprecated, superseded_by esta spec |
| Regra | C-DS-01 | Contraste WCAG AA mínimo — preservado, ver RNF-02 |
| ADR | ADR-009 | Decisão arquitetural completa |

---

## Notas Técnicas

**Tabela de conversão hex (Prata) → OKLCH, valores efetivamente aplicados:**

| Token | Light (hex origem) | Light OKLCH | Dark (hex origem) | Dark OKLCH |
|---|---|---|---|---|
| background | surface `#F4F6F8` | `97.2% 0.003 248` | surface `#14171C` | `20.4% 0.011 261` |
| foreground | ink `#14171C` | `20.4% 0.011 261` | ink `#EDEFF2` | `95.1% 0.005 258` |
| card | surfaceAlt `#E3E7EB` | `92.6% 0.007 248` | surfaceAlt `#232830` | `27.5% 0.016 260` |
| border | derivado (delta de surfaceAlt) | `88.5% 0.007 248` | derivado | `34% 0.016 260` |
| muted | = card | `92.6% 0.007 248` | derivado (delta de card) | `32.5% 0.016 260` |
| mutedForeground | inkMuted `#5B6670` | `50.4% 0.021 246` | inkMuted `#A8B2BC` | `75.9% 0.018 248` |
| primary | primary `#1B3A6B` | `35.3% 0.093 259` | primary `#8FA3B8` | `70.7% 0.038 250` |
| primaryForeground | = background (par de contraste validado, `primary/surface` em `contrastExpectations`) | `97.2% 0.003 248` | = background | `20.4% 0.011 261` |
| gold | accent `#B8902C` | `67.4% 0.122 86` | accent `#E4C465` | `82.9% 0.12 91` |
| goldForeground | fixo (nunca inverte — ver bug corrigido no showcase) | `20.4% 0.011 261` | fixo | `20.4% 0.011 261` |
| danger | alert `#B9503E` (mesmo hex nos dois temas — Heller: nunca direto sobre fundo escuro) | `56.3% 0.14 32` | = light | `56.3% 0.14 32` (sem override) |
| secondary | derivado (mesma família de `primary`, não é parte literal de Prata) | `75% 0.03 255` | derivado | `30% 0.03 255` |

Conversão feita com a fórmula sRGB→OKLab padrão (Björn Ottosson), script descartável em `/tmp/oklch.mjs` desta sessão (não versionado). `mutedForeground` light (L=50.4%) excede o teto de L≤42% documentado em `SPEC-20260721-001` RF-02 — esse teto era uma calibração para o par acromático anterior, não o requisito em si; `C-DS-01` exige razão de contraste ≥4.5:1, atingida (~5.2:1, ver `contrastExpectations` da direção Prata no showcase, e confirmada por ausência de regressão em `jest-axe`).

**Sobre a suíte de testes (RNF-01):** nenhum teste novo foi necessário — a suíte existente (141 testes em `packages/ui`, 329 em `apps/web`, incluindo `jest-axe` em `alert`/`toast`/`kpi-card`) já cobria os componentes que consomem os tokens alterados e passou integralmente após a migração.

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito) não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-07-29 | Implementação concluída (RF-01 a RF-03) e spec criada já como `approved` — decisão e implementação ocorreram na mesma sessão de trabalho, a pedido do usuário. | Gate de sincronia exige matriz atualizada com caminhos reais; ver `matrices/rastreabilidade.md`. |
| 2026-07-29 | Os dois itens de "Fora de Escopo" (varredura de cor hardcoded; realinhamento de `--surface*`/`--chart-*`/`--finance-outgoing`) foram fechados por [SPEC-20260729-002](SPEC-20260729-002-prata-fase-2-categoricos-urgencia-varredura.md) ([ADR-010](../../docs/architecture/decisions/ADR-010-paleta-categorica-e-escala-urgencia.md)), na mesma sessão. Texto original desta spec não foi alterado — só este registro de fechamento. | Usuário pediu para "implementar por completo" o que ficara fora de escopo. |
| 2026-07-31 | Spec marcada `deprecated`, `superseded_by: SPEC-20260731-001` — mudança estrutural, não editada in-place. Pesquisa de mercado (fintech + frota) mostrou que Prata reforça o padrão visual da categoria de frota (azul naval/acromático) em vez de diferenciar o Nave, além de carregar frieza emocional num produto que lida com estresse financeiro do usuário. | Decisão de Douglas em 2026-07-30, formalizada em [ADR-011](../../docs/architecture/decisions/ADR-011-adocao-direcao-azul-indigo.md) e [SPEC-20260731-001](SPEC-20260731-001-adocao-direcao-azul-indigo.md) — substituição pela direção Azul-Índigo. |
