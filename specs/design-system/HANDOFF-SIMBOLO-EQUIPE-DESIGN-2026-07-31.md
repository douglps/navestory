# Handoff Técnico — Símbolo Nave (Equipe de Design Gráfico)

> **Status: referência visual aprovada por Douglas em 2026-07-31, aguardando vetorização final.**
> Este documento consolida o que já é consenso técnico para a equipe começar a materialização
> vetorial. Não substitui `PROPOSTA-BRAND-PLATAFORMA-2026-07-30.md` (documento canônico de marca) —
> é um resumo de execução extraído dele, mais as correções e a direção de símbolo validadas nesta
> rodada. A seção 3.1 desse documento ("Direção de Logotipo") segue formalmente em revisão até a
> vetorização de produção estar concluída e validada contra os pontos abaixo; o restante da
> identidade (wordmark, paleta, voz) está fechado.

---

## 0. Referência Visual Aprovada

**Arquivo:** `specs/design-system/assets/estudo-logo-simbolo-2026-07-31.png`

Estudo gerado a partir dos prompts de `PROMPTS-SIMBOLO-VERSOES-2026-07-31.md`, cobrindo as 9
versões do checklist (§5) num único board de referência: Symbol Full (dark/claro), Symbol Small
(favicon/app icon), Wordmark isolado, Combination Mark (dark/claro), Monocromáticas (preta/branca)
e Kit de Favicon com teste de escala 16/32px.

**Aprovado como referência porque resolve os dois problemas identificados nas iterações
anteriores:**
- Wordmark corrigido para "nave" minúsculo, sans-serif geométrica (Inter SemiBold) — sem serifada,
  sem inicial maiúscula
- Symbol Small corretamente reduzido ao núcleo (estrela sem anéis orbitais), preenchimento sólido,
  legível em 16–32px
- Fundo dos cards escuros consistente com grafite neutro (`#13131A`), sem o tom navy/azul que
  apareceu num estudo anterior

**Pendências a resolver na vetorização de produção (não bloqueiam o início do trabalho, mas
precisam ser conferidas antes da entrega final):**
1. O gradiente do Symbol Full leu com um tom "rosé/cobre" na referência — confirmar com swatch
   exato que o vetor final usa `#B89A2A` → `#7B6420`, não um ouro-rosé
2. Confirmar que o Combination Mark (símbolo completo com anéis) mantém legibilidade no tamanho
   real de uso no header do produto — se for pequeno demais para os anéis, avaliar usar o Symbol
   Small mesmo no combination mark de navegação
3. Validar a tipografia do wordmark contra Inter Variable real (a referência é aproximação
   visual de IA, não a fonte exata)

---

## 1. Símbolo — Conceito Aprovado para Refinamento

**Direção:** estrela de 4 pontas com anéis orbitais (evolução do conceito "Rosa dos Ventos do
Portal" / referência interna "Keye"), testada e validada em grade de escala (16/32/64px).

**Regra central de execução — sistema em duas camadas, não uma forma só:**

| Camada | Onde usar | Conteúdo |
|---|---|---|
| **Símbolo completo** | ≥64px — dashboard, materiais de marketing, apresentações, splash screen | Estrela de 4 pontas + anéis orbitais, com o tratamento de gradiente/chanfro validado no mockup aprovado |
| **Marca reduzida (small-size mark)** | 16–32px — favicon, app icon, avatar, barra de navegação | Só o núcleo (estrela de 4 pontas), preenchimento sólido, **sem** anéis orbitais, **sem** gradiente/chanfro — testado e aprovado no painel "Small-Size Optimized Mark" |

Os dois arquivos-mãe entregues devem ser independentes (`symbol-full.svg` e `symbol-small.svg`),
não uma redução automática de escala do mesmo arquivo — a marca reduzida é um desenho à parte,
otimizado para nitidez em poucos pixels.

**Grade de referência:** 24×24px (mesma gramática dos ícones Lucide já usados no produto), com
pixel-hinting dedicado nos exports de 16px e 32px, conforme já demonstrado no teste de
escalabilidade (painel "Optimized for Scalability" / "1px-thin Geometry details / 16px grid
overlay").

**Pendência a resolver antes da produção final:** confirmar se o fundo por trás da "Small-Size
Optimized Mark" é o **grafite** `#13131A` (fundo de marca oficial) ou um azul-índigo — no mockup
avaliado, o card dessa versão aparentava um tom navy/azul em vez de grafite. Produção final deve
usar grafite, salvo decisão explícita em contrário.

---

## 2. Paleta — Valores Corrigidos (usar estes, não os do mockup anterior)

| Papel | Token | OKLCH | Hex oficial | Uso |
|---|---|---|---|---|
| Símbolo — ouro de brilho | `gold` | `oklch(67.4% 0.122 86)` | `#B89A2A` | Símbolo sobre fundo escuro; reservado a ≤10% da superfície — se o preenchimento do símbolo for extenso, preferir o bronze estrutural abaixo |
| Símbolo — ouro-bronze estrutural | `secondary` | `oklch(48% 0.10 82)` | `#7B6420` | Símbolo sobre fundo claro; alternativa ao ouro-brilho quando a área de preenchimento é grande |
| Fundo de marca (dark) | grafite `graphite-10` | — | `#13131A` | Fundo de página/cards/materiais dark — **não é azul-índigo**, é família neutra própria, dedicada |
| Wordmark sobre fundo escuro | — | — | `#FFFFFF` / `#F4F5F7` | Branco / off-white |
| Primário de marca (azul-índigo) | `primary` | `oklch(44% 0.19 250)` | `#3B30AF` | Wordmark sobre fundo claro; CTA e elementos de marca — nunca usar o hex do grafite (`#13131A`) aqui, são tokens diferentes |

> Aviso de gamut: o azul-índigo primário está fora do gamut CMYK padrão para impressão offset —
> confirmar prova de cor física antes de aprovar papelaria impressa.

---

## 3. Wordmark — Regras Já Fechadas (não fazem parte desta rodada de revisão)

- **Texto:** `nave`, sempre em **caixa baixa integral** — nunca "Nave" nem "NAVE"
- **Família:** **Inter Variable**, peso **SemiBold (600)** — não usar fonte serifada/custom
- **Letterspacing:** `-0.02em`
- **Recursos OpenType ativos:** `cv03` (zero cortado), `cv04` (`l`/`1` distintos)
- **Proporção:** altura do símbolo = cap-height do wordmark; espaçamento símbolo↔wordmark = largura
  do traço/elemento central do símbolo
- **Leitura natural:** símbolo à esquerda, wordmark à direita; versão empilhada (símbolo acima,
  wordmark abaixo) autorizada só para contextos quadrados (avatar, ícone de app)

**Racional (para a equipe entender o porquê, não só a regra):** "NAVE" maiúsculo lê como sigla de
órgão público; "Nave" com inicial maiúscula lê como nome próprio de pessoa/lugar; caixa baixa
reforça a personalidade "Direto" e "Caloroso" da marca, com precedente em marcas de tech
comparáveis (linear, vercel, notion, stripe).

---

## 4. O Que Não Fazer (erros já identificados em iterações anteriores)

- ❌ Tipografia serifada/custom no wordmark — usar Inter Variable
- ❌ "Nave" com inicial maiúscula ou "NAVE" em caixa alta — sempre `nave` minúsculo
- ❌ Usar `#13131A` como cor de azul-índigo — esse hex é exclusivamente o grafite/fundo
- ❌ Preencher o símbolo inteiro com ouro-de-brilho (`#B89A2A`) se a área for grande — esse token é
  de acento pontual (≤10% da superfície); para área extensa, usar o bronze estrutural (`#7B6420`)
- ❌ Gradiente, chanfro 3D ou efeito de iluminação na **marca reduzida** (16–32px) — esses recursos
  são exclusivos do símbolo completo (≥64px)
- ❌ Ícone/símbolo "sticker" multicolor — paleta restrita a ouro (um dos dois tons) sobre grafite
  ou branco, conforme versão

---

## 5. Entregáveis Esperados

- [ ] `symbol-full.svg` — símbolo completo (estrela + anéis), versão dark e versão fundo claro
- [ ] `symbol-small.svg` — marca reduzida (núcleo sólido, sem anéis/gradiente), versão dark e clara
- [ ] `wordmark.svg` — "nave" em Inter Variable SemiBold, caixa baixa, curvas convertidas em outline
- [ ] `combination-mark.svg` — símbolo + wordmark, proporção e espaçamento conforme §3
- [ ] Versões monocromáticas: preto sólido e branco sólido (símbolo + wordmark)
- [ ] Kit de favicon: `.ico` multi-resolução, `.png` 16×16, 32×32, 180×180 (Apple touch icon),
      gerados a partir de `symbol-small.svg`, **não** de uma redução do `symbol-full.svg`
- [ ] Teste de contraste/inversão: símbolo em branco sobre azul-índigo primário (`#3B30AF`) **e**
      em ouro sobre grafite (`#13131A`) — ambos precisam funcionar antes de aprovação final

---

## Changelog

- **2026-07-31** — Aprovada por Douglas a referência visual em `assets/estudo-logo-simbolo-2026-07-31.png`
  (9 versões geradas a partir de `PROMPTS-SIMBOLO-VERSOES-2026-07-31.md`) como base para a
  vetorização de produção. Ver §0 para as 3 pendências a confirmar antes da entrega final.

---

*Compilado em 2026-07-31 a partir de `PROPOSTA-BRAND-PLATAFORMA-2026-07-30.md` (wordmark, paleta,
regras de aplicação) e da avaliação do mockup do símbolo "estrela de 4 pontas + anéis orbitais"
(referência interna "Keye") revisado nesta conversa.*
