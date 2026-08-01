# ADR-009: Adoção da Direção "Prata" como Identidade Visual de Marca

## Status

Accepted

## Context

O navestory tinha uma identidade de marca aprovada e implementada em produção — "Steel & Sapphire" (`SPEC-20260721-001` + `SPEC-20260722-001`) — com paleta OKLCH (`packages/ui/src/tokens/colors.ts`, `apps/web/src/app/globals.css`), dark/light mode via `next-themes`, contraste WCAG AA auditado (`C-DS-01`) e um canvas levemente quente no light mode (`SPEC-20260722-002`).

Em paralelo, uma exploração de seis direções de marca ("Rota", "Pulso", "Horizonte", "Prata", "Campo", "Bússola") foi construída em `apps/web/src/app/(app)/brand-showcase/`, cada uma com racional, paleta e guidelines próprios. Diferente das demais, a direção **Prata** foi construída sobre pesquisa empírica de psicologia das cores (Eva Heller, _A Psicologia das Cores_, ~2.000 pessoas pesquisadas) em vez de tendência de mercado ou preferência estética — o acorde azul-prata-cinza é descrito na pesquisa como "a cor da tecnologia e da funcionalidade", diretamente alinhado ao perfil de produto do navestory (SaaS B2B de gestão de frota, dashboards densos de dados).

Uma sessão de revisão do showcase Prata identificou e corrigiu três problemas que também expuseram um racional de design mais amplo, reaproveitável em produção:

1. **Bug de contraste real**: componentes que coloriam texto com a mesma variável CSS usada como extremo de um gradiente de fundo (`var(--bs-surface)` como cor de texto sobre um gradiente que termina em `--bs-surface`), tornando o texto ilegível onde o card caía perto desse extremo — em ambos os temas.
2. **Vermelho de alerta saturado demais**, competindo visualmente com o ouro (único acento que deveria "gritar" na tela).
3. **Composição majoritariamente colorida** (gradiente cobrindo ~100% de uma seção, atrás de texto) — corrigida aplicando a regra 60-30-10 (60% neutro, 30% estrutural, 10% acento saturado), trazida pelo usuário como referência de proporção e distribuição de cor.

O usuário decidiu adotar Prata como a identidade de marca oficial do navestory, substituindo Steel & Sapphire, e migrar os tokens de produção agora (não apenas documentar a decisão para implementação futura).

## Decision

1. **Substituir a paleta de marca em `packages/ui/src/tokens/colors.ts` e `apps/web/src/app/globals.css`** pelos valores da direção Prata (hex já validados em `brand-showcase/_data/directions.ts`, convertidos para OKLCH): `background`/`foreground`/`card`/`border`/`muted` (neutros azul-prata-cinza, revertendo o canvas quente de `SPEC-20260722-002`), `primary` (azul tecnológico), `gold` (acento único de destaque), `danger` (terracota dessaturado, substitui o vermelho saturado anterior).
2. **`secondary` ganha um tom estrutural derivado** (mesma família de matiz de `primary`, menor chroma) — Prata não define um segundo matiz saturado; a paleta original mantém o acorde monocromático em vez de introduzir uma hue nova. `secondary` não tem consumidor em `packages/ui` hoje, então a mudança tem risco zero de regressão visual.
3. **`accent` (verde, H=140), `success`, `warning`, `info` permanecem intocados** — não fazem parte da identidade de marca substituída (são semântica de status, ortogonal à decisão) e `accent` já não tinha consumidor antes desta mudança.
4. **`R-DS-05` (proporção cromática de referência) é revisada de v1 (70/15/10/5) para v2 (60-30-10)**, versionada em `specs/RULES.md` conforme o mecanismo de versionamento de regra do projeto — `SPEC-20260722-001` cita a regra sem versão travada, então herda v2 automaticamente.
5. **Nova regra `R-DS-06`** formaliza o terracota como o único tom de `danger` permitido e a restrição de nunca aplicá-lo como fundo sólido direto sobre `background`/`card` do tema ativo (só sobre `danger-pastel`) — mesmo racional que já protegia o dourado (Heller: "vermelho nunca direto sobre fundo escuro").
6. **`SPEC-20260722-002` (canvas quente) é marcada `deprecated`**, `superseded_by: SPEC-20260729-001` — Prata usa um canvas frio (azul-prata), incompatível com o ajuste quente anterior.
7. **Nova spec `SPEC-20260729-001`** formaliza os requisitos rastreáveis desta adoção (RF-01 a RF-03), incluindo a tabela de conversão hex→OKLCH e a revalidação de contraste.

## Consequences

**Facilita:**

- Identidade de marca com racional empírico documentado (Heller) em vez de preferência estética não-verificável — mais fácil de defender/explicar em decisões futuras de design.
- `danger`/`gold` ganham regras explícitas (`R-DS-06`, nota de `goldForeground` fixo) que fecham uma classe de bug de contraste (texto colorido com a cor errada do próprio tema) antes que ela chegasse à produção — o bug foi pego no showcase, não em produção.
- Suíte de testes existente (`jest-axe` em `packages/ui`, 141 testes; `apps/web`, 329 testes) já cobria os componentes que consomem esses tokens — a migração foi validada sem escrever teste novo, rodando a suíte já existente.
- `secondary` ganha um valor coerente com a identidade de marca, pronto para uso futuro, sem custo de regressão (zero consumidores hoje).

**Dificulta:**

- Reverte uma decisão de produto recente e deliberada (canvas quente, `SPEC-20260722-002`, aprovada há uma semana) — o app muda de temperatura de cor no light mode pela segunda vez em pouco tempo, o que pode gerar percepção de instabilidade de marca se repetido com frequência.
- `mutedForeground` (light) sobe de L=42% para L=50.4% em OKLCH — o teto de L≤42% documentado em `SPEC-20260721-001` RF-02 era uma heurística calibrada para a paleta acromática anterior, não o requisito em si (`C-DS-01` exige razão de contraste ≥4.5:1, que o novo tom atinge, ~5.2:1); specs futuras que citarem "L≤42%" como regra literal precisam ser reinterpretadas à luz desta ADR.
- `primary` em dark mode fica com chroma bem mais baixa (0.038 vs. 0.22 anterior) — mais fiel à paleta Prata original (calibrada para uma composição de gradiente, não para um botão isolado), mas potencialmente menos "vibrante" como cor de ação em dark mode; não foi reforçada artificialmente para preservar fidelidade à paleta validada, mas fica registrado como ponto a observar em uso real.
- `--surface`/`--on-surface`/`--chart-*`/`--finance-outgoing` (tokens introduzidos por `SPEC-20260721-002`, dashboard v2) **não foram tocados** — ficam temporariamente fora de alinhamento com a nova paleta de marca (ainda usam o par de neutros achromático antigo em alguns casos) até uma spec dedicada do dashboard os revisar.

**Trade-offs aceitos:**

- `secondary` é um valor **derivado/interpretativo** (não uma extração literal da paleta Prata, que não define esse papel) — documentado como tal, revisável sem custo por não ter consumidor hoje.
- Nenhuma varredura de cor hardcoded fora do sistema de tokens foi feita nesta rodada (fora de escopo desta ADR) — pode deixar telas com hex literal ad hoc divergentes da nova identidade; fica como trabalho futuro se identificado.

## References

- `specs/design-system/SPEC-20260729-001-adocao-direcao-prata.md` — spec que formaliza esta decisão
- `specs/design-system/SPEC-20260721-001-design-system-fundamentos.md` — mecanismo de tokens/dark mode que esta ADR reutiliza sem alterar
- `specs/design-system/SPEC-20260722-001-design-system-v2-direcao-criativa.md` — R-DS-05 revisado (v1→v2), demais requisitos inalterados
- `specs/design-system/SPEC-20260722-002-canvas-quente-light-mode.md` — deprecated, superseded_by SPEC-20260729-001
- `apps/web/src/app/(app)/brand-showcase/_data/directions.ts` — fonte dos valores hex da direção Prata
- `specs/RULES.md` — R-DS-05 (v2), R-DS-06 (nova)
- `matrices/impacto.md`, `matrices/rastreabilidade.md`
