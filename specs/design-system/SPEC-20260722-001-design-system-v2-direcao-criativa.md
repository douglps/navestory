---
id: SPEC-20260722-001
title: "Design System v2 — Direção Criativa (Steel & Sapphire), Gramática de Cor e Estrutura de Documentação"
status: approved
date: 2026-07-22
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-DS-02, R-DS-03, R-DS-04, R-DS-05]
security: []
camadas: [frontend, design]
---

# SPEC-20260722-001: Design System v2 — Direção Criativa, Gramática de Cor e Estrutura de Documentação

**Status:** approved
**Criada em:** 2026-07-22
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

---

## Contexto

Em 2026-07-22, o usuário solicitou uma verificação completa do design system atual ("Steel & Sapphire", formalizado em `SPEC-20260721-001`) e o uso de um documento de inspiração externo — uma análise do design language do Notion (`DESIGN-notion.md`, fora do repositório) — para evoluir a identidade visual do Nave de forma mais criativa, sem abandonar o perfil de produto (SaaS B2B de gestão de frota, dashboards densos de dados, "Calm UI" anti-fadiga).

Uma pesquisa de mercado (via agente `design-system`) confirmou dois pontos que esta spec formaliza:

1. **O formato `Design.md` não é o padrão clássico de documentação de design system** (que é multi-página: Polaris, Carbon, Atlassian, Material 3) — é uma convenção emergente de 2026 para consumo por AI coding agents, complementar à documentação humana, não substituta.
2. **A estrutura de seções desses sistemas maduros converge**: Foundations, Tokens, Componentes, Padrões, Acessibilidade, Content/Voice, Governança. O usuário decidiu adotar essa estrutura como **padrão obrigatório** para toda documentação de design system do projeto daqui em diante — não apenas para este documento pontual.

A pesquisa também identificou riscos concretos de importar literalmente a estética Notion para o Nave: paleta decorativa multicolor ("sticker") sem semântica de status colidiria com a gramática de cor já usada para comunicar saúde de veículo/urgência/custo; pill buttons (`rounded-full`) em toda ação de interface prejudicam escaneabilidade em telas com 15-20 ações simultâneas. Essas armadilhas foram descartadas explicitamente pelo usuário na decisão de produto.

## Objetivo

Formalizar como requisitos rastreáveis: (1) a direção criativa aprovada para o Steel & Sapphire v2 — tipografia com mais hierarquia, numerais tabulares, reforço do dourado de marca como único elemento decorativo, dark-first mais rigoroso; (2) a proibição explícita de paleta decorativa multicolor e de pill buttons em ações de interface; (3) a proporção cromática de referência para auditoria visual; (4) a estrutura obrigatória de seções para toda documentação de design system do projeto, incluindo o novo `Design.md` na raiz do repositório.

## Material de Referência (não duplicar aqui)

| Documento | Conteúdo | Caminho |
|-----------|----------|---------|
| Fundamentos aprovados (2026-07-21) | Tokens `--gold`, dark/light mode, contraste AA, NavBadge, VehicleContextSelector, CommandPalette | [SPEC-20260721-001](SPEC-20260721-001-design-system-fundamentos.md) |
| Inventário do Design System | Estado atual de tokens e componentes em `packages/ui` | [INVENTARIO-DESIGN-SYSTEM.md](INVENTARIO-DESIGN-SYSTEM.md) |
| `Design.md` | Documento AI-agent-facing, raiz do repositório — tokens + racional qualitativo, aplica a estrutura de seções desta spec | `/Design.md` |

---

## Histórias de Usuário e Critérios de Aceitação

**Persona P1 — Douglas, mantenedor do Nave**, responsável pela identidade visual e consistência do design system.
**Persona P2 — Gestor de frota**, usuário final que consome dashboards densos de dados por longos períodos.

### US-01 — Documentação de design system com estrutura previsível

**Como** P1, **quero** que toda documentação de design system do projeto siga a mesma estrutura de seções, **para** que qualquer pessoa (ou agente de IA) encontre Foundations, Tokens, Componentes, Padrões, Acessibilidade e Governança sempre no mesmo formato, independente de qual documento está lendo.

- **Dado que** um novo documento de design system é criado no projeto (`Design.md`, `docs/ui-design/design-system.md`, ou spec futura da feature `design-system`), **quando** o documento é revisado, **então** contém, nesta ordem, ao menos as seções: Foundations, Tokens, Componentes, Padrões, Acessibilidade, Content/Voice, Governança (seções vazias declaram explicitamente "não aplicável nesta fase", nunca são omitidas silenciosamente).
- **Dado que** o `Design.md` da raiz é consultado por um agente de IA, **quando** o agente busca o racional de uma decisão de cor ou componente, **então** encontra referência cruzada para a spec/inventário correspondente, sem duplicar o conteúdo técnico já existente em `packages/ui/src/tokens`.

### US-02 — Cor comunica status, nunca decora

**Como** P2, **quero** que cor em tela sempre signifique algo sobre o estado dos meus dados, **para** conseguir confiar no sistema de cores sem precisar ler o texto ao lado para confirmar se é "só estética" ou um alerta real.

- **Dado que** um componente novo é adicionado ao design system, **quando** ele usa `success`/`warning`/`danger`/`info`, **então** a cor está vinculada a um estado real de dado (saúde, custo, urgência, informação) — nunca aplicada como decoração ou variação estética sem significado.
- **Dado que** um componente precisa de um elemento visual de destaque sem relação com status, **quando** esse destaque é implementado, **então** usa o token `gold` (reservado a esse papel) — nenhuma nova família de cor decorativa é introduzida.

### US-03 — Hierarquia de ação por forma (raio de borda)

**Como** P2, **quero** distinguir rapidamente uma tag/filtro selecionado de um botão de ação, **para** não confundir elementos clicáveis com rótulos informativos em telas densas.

- **Dado que** um novo botão de ação de interface é criado (formulário, tabela, header), **quando** seu raio de borda é definido, **então** usa no máximo `rounded-md` — nunca `rounded-full`.
- **Dado que** um badge, tag ou preset de filtro é criado, **quando** seu raio de borda é definido, **então** pode usar `rounded-full` livremente — é o único contexto permitido.

### US-04 — Legibilidade numérica em colunas de dado

**Como** P2, **quero** que colunas de valores (R$, km) fiquem alinhadas verticalmente, **para** comparar números de uma olhada sem que os dígitos "dancem" horizontalmente entre linhas.

- **Dado que** uma tabela ou `KpiCard` exibe um valor numérico, **quando** renderizado, **então** usa `font-variant-numeric: tabular-nums` (classe Tailwind `tabular-nums`).

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | História relacionada |
|----|-----------|------------|----------------------|
| RF-01 | Criar `Design.md` na raiz do repositório seguindo a estrutura de seções de R-DS-02, referenciando (não duplicando) `packages/ui/src/tokens`, `INVENTARIO-DESIGN-SYSTEM.md` e as specs de design system existentes | Alta | US-01 |
| RF-02 | Registrar em `specs/RULES.md` as regras R-DS-02 (estrutura de documentação), R-DS-03 (gramática semântica de cor), R-DS-04 (granularidade de raio) e R-DS-05 (proporção cromática de referência) | Alta | US-01, US-02, US-03 |
| RF-03 | Aplicar `tabular-nums` no valor principal de `KpiCard` (`packages/ui/src/components/kpi-card.tsx`) e em `TableCell` (`packages/ui/src/components/table.tsx`) | Média | US-04 |
| RF-04 | Atualizar `docs/ui-design/design-system.md` para apontar também para o novo `Design.md` e para esta spec, sem duplicar conteúdo | Baixa | US-01 |

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Nenhuma nova família de cor decorativa é introduzida nos tokens (`packages/ui/src/tokens/colors.ts`) | Diff de `colors.ts` desta spec em diante: zero tokens novos fora de `background/foreground/card/border/muted/primary/secondary/accent/gold/success/warning/danger/info` e seus `-foreground`/`-pastel` |
| RNF-02 | Nenhum botão de ação de interface em `packages/ui` usa `rounded-full` | Auditoria de código: `grep -rn "rounded-full" packages/ui/src/components/button.tsx` retorna vazio |

---

## Fora de Escopo

- Recalibração perceptual completa da paleta em dark mode (`secondary`/`accent`/`success`/`warning`/`danger`/`info`) — permanece fora de escopo desde `SPEC-20260721-001`, sem mudança aqui.
- Migração de superfície off-white quente no light mode (`--background`) — avaliação de chroma sutil fica registrada como nota técnica para spec futura dedicada, não implementada nesta rodada (ver Notas Técnicas).
- Reestruturação de `docs/ui-design/design-system.md` em múltiplos arquivos por seção — a estrutura de seções (R-DS-02) é aplicada dentro do arquivo único existente e do novo `Design.md`; divisão em site multi-página fica fora de escopo (contradiria a decisão de manter Markdown versionado no repositório).

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260721-001 | Tokens `--gold`, contraste AA e dark/light mode — base sobre a qual esta spec constrói |
| Spec | SPEC-20260525-001 | Componentes base de `packages/ui` (`KpiCard`, `Table`) alterados por RF-03 |
| Regra | R-DS-01, C-DS-01 | Regras de design system pré-existentes, não alteradas por esta spec |

## Notas Técnicas

**Sobre o off-white quente (Fora de Escopo, nota para spec futura):** a pesquisa de mercado indica que um canvas levemente quente reduz fadiga em sessões longas, mas exige cautela porque um fundo com chroma amarelado reduz o contraste percebido de `warning` (âmbar). Se implementado no futuro, o ajuste deve manter chroma no eixo b+ abaixo de 0.01 em OKLCH e ser revalidado com `jest-axe` contra C-DS-01 antes de aprovação.

**Sobre a proporção cromática (R-DS-05):** é uma diretriz de auditoria visual, não uma métrica automatizável por lint — revisão manual em `reviewer`/`design-system` ao avaliar telas novas.

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`.

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-07-22 | Implementação concluída e spec movida de `draft` para `approved`. RF-01 (`Design.md`), RF-02 (regras R-DS-02 a R-DS-05 em `RULES.md`) e RF-04 (`docs/ui-design/design-system.md` atualizado) concluídos como documentação/governança. RF-03 (`tabular-nums`) implementado em `KpiCard` e `TableCell`, sem teste automatizado dedicado à classe CSS — ver `matrices/rastreabilidade.md` para status detalhado. | Gate de sincronia exige matriz atualizada com caminhos reais ao concluir a implementação, conforme `.claude/CLAUDE.md`. |
