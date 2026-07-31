# ADR-010: Paleta Categórica Dedicada e Escala de Urgência de Vencimento

## Status

Accepted

## Context

`ADR-009` (adoção da direção Prata) deixou dois itens explicitamente "Fora de Escopo": a varredura de cor hardcoded fora do sistema de tokens, e o realinhamento dos tokens `--surface*`/`--chart-*`/`--finance-outgoing` (introduzidos por `SPEC-20260721-002`, dashboard v2), que ainda carregavam valores pré-Prata.

Ao mapear esse trabalho, duas exploração de código (`Explore`) revelaram que a maior parte da varredura era mecânica (Tailwind ad hoc → tokens semânticos já existentes, mapeamento 1:1), mas duas situações exigiam um token novo porque não tinham correspondente semântico no sistema atual:

1. **Indicadores de "modo/contexto" sem status real** — o chip de contexto de veículo (single/group/multi/attribute) e a legenda de bolinhas da sidebar usam cor só para diferenciar categorias, não para comunicar um estado (bom/ruim/atenção). A regra `R-DS-03` já proíbe "paleta decorativa multicolor sem significado de status", então usar `success`/`warning`/`danger`/`info` aqui seria uma apropriação indevida de semântica.
2. **Escada de urgência de vencimento de despesas** — 5 níveis de intensidade (vencido/≤7d/≤14d/≤30d/≤60d) que o modelo "semântico flat" (um tom por estado, sem gradiente de intensidade) não cobre.

Seguindo instrução explícita do usuário — decisões subjetivas/estratégicas de design devem ser fundamentadas por agente especializado, não escolhidas ad hoc — o agente `design-system` foi consultado para as duas decisões, com pesquisa em Okabe-Ito (Color Universal Design), ColorBrewer e ISO 11064-4 (Human Centred Design for Control Rooms).

## Decision

### 1. Paleta categórica dedicada (`--categorical-1..5`)

Substitui `--chart-1..5` (que ainda usava hues pré-Prata: azul antigo H=260, ciano H=200, vermelho antigo H=25). A nova paleta é reaproveitada tanto pelos 5 gráficos multi-série do dashboard/analytics quanto pelo indicador de modo de contexto de veículo — uma fonte única em vez de arrays de cor duplicados por componente.

Hues escolhidos (Azure H=258, Teal H=195, Olive H=132, Sand H=72, Plum H=315) para permanecerem distinguíveis sob deuteranopia/protanopia por combinação de matiz + luminosidade, não só matiz — evitando reusar `success` (H=150) ou `gold` (H=86-91) em série de gráfico, o que criaria falsa leitura de status ou competiria com o único acento decorativo.

Mapeamento do modo de contexto de veículo (preservando a codificação existente sólido=permanente/tracejado=temporário): `single`/`multi` = categorical-4 (Sand), `group` = categorical-1 (Azure), `attribute` = categorical-5 (Plum). `single` e `multi` compartilham hue porque compartilhavam a mesma família antes (âmbar) — a diferenciação continua sendo a borda sólida/tracejada, não a cor.

### 2. Escala de urgência (`--urgency-hot`/`--urgency-hot-pastel`)

Colapsada de 5 para 4 níveis: Vencido (`danger`) → ≤7d (novo `urgency-hot`, terracota mais vívido) → ≤30d (`warning`) → ≤60d (`info`). Fundamentado em ISO 11064-4: no máximo 4 níveis de urgência codificados por cor antes de exigir legenda — acima disso o usuário não processa "de relance". Os dois níveis "âmbar" anteriores (≤14d/≤30d) foram fundidos porque a distância visual entre eles já não passava de sinal (mesma família, opacidade diferente); o label numérico (`Nd`) preserva a granularidade fina que a cor deixou de carregar sozinha.

Só um par de tokens novo foi necessário — os outros 3 níveis reaproveitam `danger`/`warning`/`info` já existentes.

### 3. Realinhamento de `--surface*`/`--finance-outgoing`/`--primary` (dark)

`--surface`, `--surface-elevated`, `--on-surface*` (usados por `.glass-card`/`.kicker`, consumidos por `UpcomingCostsWidget`) eram acromáticos puros (`L% 0 0`) — realinhados à mesma família de matiz do novo `--background`/`--foreground` (H≈248 light / H≈261 dark). `--finance-outgoing` (pré-Prata, H=25) passa para a família terracota (H=32) de `--danger`/`--urgency-hot`.

`--primary` em dark mode ganhou mais chroma (de `0.038` para `~0.11`) — decisão explícita do usuário, não do agente de design — para funcionar melhor como cor de botão/link real; o valor original, fiel ao hex literal do showcase Prata, foi calibrado para uma composição de gradiente decorativo, não para um elemento de ação isolado.

## Consequences

**Facilita:**
- Um único util (`apps/web/src/lib/chart-colors.ts`) substitui 4 arrays de cor duplicados (`FleetCharts.tsx` e mais 3 arquivos de gráfico que usavam hex hardcoded `#2563eb`/`#16a34a`/`#93c5fd` sem relação com a marca).
- `vehicle-context-chip.tsx` e `sidebar.tsx` passam a compartilhar a mesma fonte de cor categórica em vez de duas cópias independentes do mapeamento amber/blue/violet.
- `fines/page.tsx` e `fines/[id]/page.tsx` (mapa de status idêntico duplicado) ganham um helper único (`apps/web/src/lib/fines/status-badge.ts`).
- A escada de urgência e a paleta categórica têm racional de acessibilidade documentado (Okabe-Ito/ColorBrewer/ISO 11064-4) em vez de serem escolhas de gosto pessoal.

**Dificulta:**
- O dot passivo da sidebar perde a distinção visual entre `single` e `multi` (ambos viram `categorical-4`) — a diferenciação sólido/tracejado que existia no chip não é replicável num dot de bolinha única; aceito porque o dot é um indicador passivo secundário, não a superfície de interação primária (o chip do header continua diferenciando via borda tracejada).
- `--categorical-1..5` não tem relação de reuso com `success`/`warning`/`danger`/`info` — qualquer novo consumidor precisa saber que essa paleta é exclusivamente para dados sem status real (documentado em `R-DS-07`).
- `--primary` dark mode diverge do valor literal validado no showcase Prata (chroma reforçada por decisão de produto, não por fidelidade à pesquisa de Heller).

## References

- `docs/architecture/decisions/ADR-009-adocao-direcao-prata.md` — decisão que deixou este trabalho como "Fora de Escopo"
- `specs/design-system/SPEC-20260729-002-prata-fase-2-categoricos-urgencia-varredura.md`
- `specs/RULES.md` — R-DS-07 (paleta categórica), R-DS-08 (escala de urgência)
- `apps/web/src/app/globals.css` — valores OKLCH aplicados
- `apps/web/src/lib/chart-colors.ts`, `apps/web/src/lib/fines/status-badge.ts`
