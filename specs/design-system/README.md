# Specs — Design System

Domínio responsável pelos tokens visuais, componentes de UI compartilhados em `packages/ui` e fundamentos de marca do Nave.

## Specs

| Spec | Título | Status |
|------|--------|--------|
| [SPEC-20260525-001](SPEC-20260525-001.md) | Design System — Novos Componentes UI | `approved` (v0.3, 2026-07-19) — implementação (T8.1) não iniciada |
| [SPEC-20260721-001](SPEC-20260721-001-design-system-fundamentos.md) | Design System — Fundamentos de Marca, Tokens de Cor, Tema e Componentes de Navegação Global | `approved` (2026-07-21) |
| [SPEC-20260722-001](SPEC-20260722-001-design-system-v2-direcao-criativa.md) | Design System v2 — Direção Criativa, Gramática de Cor e Estrutura de Documentação | `approved` (2026-07-22) |
| [SPEC-20260722-002](SPEC-20260722-002-canvas-quente-light-mode.md) | Design System — Canvas Quente Sutil no Light Mode | `approved` (2026-07-22) |

## Documentos de Referência

| Documento | Propósito |
|-----------|-----------|
| [INVENTARIO-DESIGN-SYSTEM.md](INVENTARIO-DESIGN-SYSTEM.md) | Estado atual dos tokens e componentes implementados em `packages/ui`; fonte para recriar Figma Variables |
| [PESQUISA-FUNDAMENTOS-DESIGN-SYSTEM.md](PESQUISA-FUNDAMENTOS-DESIGN-SYSTEM.md) | Pesquisa de metodologia, paleta OKLCH, dark/light mode, StatusBadge, NavBadge, Command Palette — racional técnico das decisões de produto de 2026-07-21 |
| [PROMPT-FIGMA-MAKE.md](PROMPT-FIGMA-MAKE.md) | Prompts de apoio para geração de artefatos no Figma Make |
| [`/Design.md`](../../Design.md) | Documento AI-agent-facing na raiz do repo — tokens + racional qualitativo, segue a estrutura de seções de R-DS-02 |

## Regras de Domínio Relacionadas

| ID | Resumo |
|----|--------|
| R-DS-01 | NavBadge trunca contagem > 9 para "9+"; nunca renderiza 2+ dígitos |
| R-DS-02 | Documentação de design system segue estrutura obrigatória de seções (Foundations, Tokens, Componentes, Padrões, Acessibilidade, Content/Voice, Governança) |
| R-DS-03 | Cor semântica comunica status real; `gold` é o único elemento decorativo; nenhuma paleta multicolor sem significado |
| R-DS-04 | `rounded-full` reservado a badge/tag/filtro; ações de interface usam raio ≤ `rounded-md` |
| R-DS-05 | Proporção cromática de referência: ~70% neutro / ~15% primary / ~10% semântico / ~5% gold |
| C-DS-01 | Contraste WCAG AA (4.5:1 normal / 3:1 grande) obrigatório em todo texto, ambos os temas |

Ver `specs/RULES.md` para a definição completa com versão e histórico.

## Implementação

Componentes em `packages/ui/src/components/`. Tokens em `packages/ui/src/tokens/`.
