# ADR-011: Adoção da Direção "Azul-Índigo" como Identidade Visual de Marca

## Status

Accepted

## Context

O navestory adotou "Prata" (`ADR-009`, `SPEC-20260729-001`) como identidade de marca em produção — azul-prata-cinza validado por Eva Heller como "cor da tecnologia e funcionalidade", com paleta OKLCH aplicada em `packages/ui/src/tokens/colors.ts` e `apps/web/src/app/globals.css`.

Uma rodada de pesquisa de mercado (branding de fintech e de players de mobilidade/frota) revelou dois problemas com Prata que a validação empírica de Heller, isolada, não capturava:

1. **Invisibilidade competitiva** — azul naval/acromático frio é o padrão quase universal em apps de gestão de frota (Samsara, Motive). Prata reforça a categoria em vez de diferenciar o navestory dentro dela.
2. **Frieza emocional** — o navestory lida com momentos de estresse financeiro do usuário (despesa inesperada, manutenção cara, alerta de atraso); a paleta acromática, embora ergonomicamente correta para telas densas, não carrega calor nenhum nesses momentos.

A pesquisa de fintech (Nubank/roxo, Monzo/coral, Mercury/roxo-escuro) mostrou o padrão oposto funcionando: reconhecimento de marca real vem de romper com o azul corporativo genérico da categoria, não de reforçá-lo — desde que a ruptura tenha racional psicológico, não seja modismo.

O navestory ainda não foi lançado — não há usuário real, dado de conversão/retenção nem custo de reconhecimento de marca a proteger. É o momento de menor custo possível para revisar a identidade visual antes que ela se torne cara de mudar.

O racional completo — três direções avaliadas (Âmbar, Azul-Índigo, Verde), pesquisa de mercado com fontes, paleta tonal completa, arquitetura de tokens em 3 camadas, tipografia, matriz de estados de componente, elevação, iconografia, motion, acessibilidade e voz de marca — está em `specs/design-system/PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md`, aprovado por Douglas em 2026-07-30. Este ADR formaliza a decisão arquitetural; a proposta é o documento de definição, não duplicado aqui.

O usuário decidiu adotar Azul-Índigo como nova identidade de marca, mas **não** migrar os tokens de produção nesta mesma rodada (diferente de Prata) — este ADR e a spec que o acompanha cobrem a etapa de formalização/definição; a migração de tokens é trabalho subsequente rastreado como requisito pendente na spec.

## Decision

1. **Substituir a cor primária de marca** de azul-prata frio (H≈259, Prata) por **azul-índigo** (H≈250) — calibrado deliberadamente mais próximo do azul puro do que uma primeira exploração em H≈265, para não cruzar para o registro "roxo de fintech genérico" mantendo diferenciação real da categoria de frota (nenhum concorrente relevante ocupa esse espaço do espectro).
2. **Desacoplar o fundo do dark mode da família do primário** — passa a ser um grafite dedicado (`≈#13131A`), neutro próprio, em vez de um tom escurecido da própria cor de marca. Evita a sensação de tela inteira "tingida" e sustenta uma escala de superfícies (`surface-0/1/2`) por variação de luminosidade, não sombra.
3. **`gold` mantém seu papel de acento (~5–10% da superfície) sem alteração**, e ganha um segundo papel novo, **`secondary` (bronze/ouro-velho, mais profundo e dessaturado)**, para uso estrutural de maior área (botão secundário, divisor, materiais de marca externos) — ancorado na referência do Barroco Mineiro (talha dourada sobre azulejo azul), não em "azul-marinho + dourado corporativo" genérico. `danger`/`success` permanecem intocados (sem conflito semântico com a nova primária).
4. **Adotar paleta tonal completa do azul-índigo (12 tons, primitivos)** e uma escala de grafite independente — resolve a sensação de "vazio" em telas de pouco conteúdo via degradê contido, sempre dentro da própria família de cor e nunca atrás de texto (nova regra, ver item 6).
5. **Formalizar arquitetura de tokens em 3 camadas** (primitivo → semântico → componente), alinhada a Material Design 3/Radix Themes — o navestory ainda não tinha camada de componente explícita.
6. **Nova regra de uso de degradê**, registrada como **`R-DS-11`** em `specs/RULES.md` — a proposta original a chamava de "R-DS-08", mas esse ID já está ocupado (escala de urgência, `SPEC-20260729-002`); corrigido para o próximo ID livre da série `R-DS`.
7. **Formalizar `C-DS-02`** (achado durante a construção do Design System Showcase em 2026-07-30, registrado no changelog da proposta mas nunca elevado a regra em `RULES.md`): tokens `*-pastel` (`success`/`warning`/`danger`/`info`) precisam de override explícito em `darkColorChannels` — hoje caem no valor claro do light mode em dark mode, tornando `text-foreground` sobre `bg-*-pastel` quase ilegível.
8. **Definir sistema tipográfico formal** (Inter variável, escala modular razão 1.2, regra obrigatória de `tabular-nums` em dado numérico) — hoje inexistente, o Tailwind roda no default do SO.
9. **`SPEC-20260729-001` (Prata) é marcada `deprecated`**, `superseded_by: SPEC-20260731-001` — mudança estrutural (substitui a identidade de marca vigente), não editada in-place.
10. **Nova spec `SPEC-20260731-001`** formaliza os requisitos rastreáveis desta adoção. Diferente de Prata (`ADR-009`), a migração de tokens de produção **não** ocorre nesta mesma rodada — a spec nasce em `status: draft`, com os requisitos de conversão OKLCH, atualização de `RULES.md`/matrizes, migração de `colors.ts`/`globals.css` e fechamento de `C-DS-01`/`C-DS-02` como trabalho subsequente.

## Consequences

**Facilita:**

- Diferenciação real de mercado — nenhum concorrente de frota ocupa o espaço do azul-índigo, ao contrário do azul-prata/naval que é o padrão quase universal da categoria.
- Preserva a maior parte do trabalho já validado em Prata: `gold`, `danger`, `success`, `warning`, `info`, iconografia (Lucide), regra 60-30-10 (`R-DS-05` v2) — o escopo de mudança fica concentrado no token primário e seus derivados diretos, mais o fundo dark mode.
- Fecha duas pendências de acessibilidade que estavam soltas (`C-DS-01` formalmente sem fechamento; `C-DS-02` identificada mas nunca registrada como regra) na mesma rodada de revisão de tokens.
- Ganha, pela primeira vez, um sistema tipográfico formal e uma arquitetura de tokens em 3 camadas — reduz ambiguidade para expansão futura de `packages/ui`.

**Dificulta:**

- Reverte a identidade de marca pela segunda vez em poucos dias (Steel & Sapphire → Prata → Azul-Índigo) — risco de percepção de instabilidade de marca se o padrão se repetir; mitigado pelo fato de o produto ainda não ter sido lançado (nenhum usuário real exposto às mudanças anteriores).
- Ao contrário de Prata, a definição e a implementação **não** ocorrem na mesma rodada — a spec nasce `draft`, não `approved`; o gate de sincronia (spec ↔ código ↔ matriz) só se aplica quando a spec avançar para `approved`, então a matriz de rastreabilidade recebe entrada com código/teste `pendente` nesta etapa.
- `secondary` ganha um segundo significado (bronze estrutural) que não existia antes — precisa de cuidado para não colidir visualmente com `gold` (regra explícita: nunca lado a lado na mesma composição).

**Trade-offs aceitos:**

- A calibração H≈250 (não H≈265) é uma escolha deliberada de distância do "roxo de fintech genérico" — mais próxima do azul-prata anterior do que a exploração inicial, o que reduz a ruptura de diferenciação de mercado um pouco em troca de reduzir o risco de leitura equivocada da cor.
- Correção do ID de regra (`R-DS-08` → `R-DS-11`) é uma discrepância entre o documento de proposta (já aprovado por Douglas com o texto "R-DS-08") e o `RULES.md` real — o texto da proposta permanece como está (documento de definição já aprovado), mas a spec e o `RULES.md` usam o ID correto.

## References

- `specs/design-system/PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md` — definição completa (pesquisa de mercado, paleta tonal, tipografia, tokens, componentes, acessibilidade, voz de marca), aprovada por Douglas em 2026-07-30
- `specs/design-system/SPEC-20260731-001-adocao-direcao-azul-indigo.md` — spec que formaliza esta decisão como requisitos rastreáveis
- `docs/architecture/decisions/ADR-009-adocao-direcao-prata.md` — decisão substituída por este ADR
- `specs/design-system/SPEC-20260729-001-adocao-direcao-prata.md` — deprecated, superseded_by `SPEC-20260731-001`
- `specs/RULES.md` — `R-DS-11` (nova), `C-DS-02` (nova)
- `matrices/impacto.md`, `matrices/rastreabilidade.md`
