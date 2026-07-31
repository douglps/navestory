/**
 * @spec SPEC-20260525-001 §4.1
 * @spec SPEC-20260731-001 RF-02 — paleta de marca substituída pela direção Azul-Índigo
 * Fonte da verdade dos tokens de cor. Valores em canais OKLCH ("L C H", sem a função
 * `oklch()` em volta) para permitir modificador de opacidade do Tailwind
 * (`oklch(var(--x) / <alpha-value>)` em tailwind.config.ts, ex: `bg-primary/50`).
 *
 * Paleta de marca (background/foreground/card/border/muted/primary/secondary) substituída
 * pela direção "Azul-Índigo" (H≈250), adotada em `SPEC-20260731-001`/`ADR-011` — pesquisa de
 * mercado (fintech + frota) mostrou que a direção anterior ("Prata", azul-prata-cinza)
 * reforçava o padrão visual quase universal da categoria de frota (Samsara, Motive) sem
 * diferenciar o Nave. `background`/`foreground`/`card`/`cardForeground`/`border`/`muted` agora
 * vivem numa escala de **grafite dedicada**, independente da família de `primary` — o azul
 * aparece só em `primary`/`secondary`, nunca "tingindo" o fundo neutro. Valores convertidos e
 * validados em `apps/web/src/app/(app)/design-system/_lib/tokens.ts` (`PROPOSED_TOKENS`),
 * portados aqui sem alteração. `gold` (acento) permanece intocado; `secondary` passa a ser o
 * ouro estrutural ("bronze", referência Barroco Mineiro) — não mais um neutro derivado do
 * antigo `primary`. `accent` (verde, H=140) nunca teve consumidor em `packages/ui` e permanece
 * intocado — R-DS-03 já proíbe introduzir nova família decorativa. `success`/`warning`/`info`
 * são semânticos, não de marca — fora de escopo. Os tons "solid" de success/warning/danger/info
 * continuam calibrados para contraste sobre o `-pastel` da mesma família, não sobre
 * `--card`/`--background` (C-DS-01 — ver `kpi-card.tsx`).
 */
export const colorChannels = {
  // @spec SPEC-20260731-001 RF-02 — grafite dedicado da direção Azul-Índigo (substitui o
  // acorde azul-prata-cinza de Prata, que ficava atrelado à família do primary).
  background: "97.0% 0.003 265",
  foreground: "19.0% 0.014 285",

  card: "94.0% 0.004 271",
  cardForeground: "19.0% 0.014 285",

  border: "88% 0.005 270",

  muted: "90% 0.005 270",
  // @spec SPEC-20260729-001 — L=50.4% (era 42%): o teto de L≤42% era calibrado para o par
  // acromático anterior, não é o requisito em si. C-DS-01 exige razão de contraste ≥4.5:1, que
  // este tom atinge sobre o novo `background` grafite (mesma família neutra de Prata, luminância
  // equivalente) — validado em `contrastExpectations` do showcase e revalidado por `jest-axe`.
  mutedForeground: "50.4% 0.021 246",

  // @spec SPEC-20260731-001 RF-02 — Azul-Índigo (H≈250), substitui o azul-prata frio de Prata
  // (H≈259) — nenhum concorrente de frota ocupa este espaço do espectro (ver ADR-011).
  primary: "44% 0.19 250",
  primaryForeground: "97.0% 0.003 265",

  // @spec SPEC-20260731-001 RF-02 — ouro estrutural ("bronze"/"ouro velho"), referência Barroco
  // Mineiro (talha dourada sobre azulejo azul) — segunda cor de marca, distinta de `gold`
  // (acento de brilho, inalterado). Nunca lado a lado com `gold` na mesma composição. Sem
  // consumidor em `packages/ui` hoje (grep confirmado antes da migração) — risco zero de
  // regressão visual.
  secondary: "48% 0.10 82",
  secondaryForeground: "97.0% 0.003 265",

  accent: "55.6% 0.15 140",
  accentForeground: "15% 0 0",

  // @spec SPEC-20260729-001 RF-01 — dourado de Prata (accent da direção), calibrado para o
  // mesmo papel do token anterior: acento de destaque isolado, nunca fundo de área grande,
  // nunca ao lado de um elemento prateado de mesmo peso (regra heráldica).
  // Uso proibido em produção: texto pequeno sobre fundo claro e fundo de CTA principal.
  // `goldForeground` é sempre grafite escuro fixo (não inverte em dark mode) — o ouro
  // permanece claro/quente nos dois temas, então o texto que contrasta com ele também não
  // muda; ver bug corrigido no showcase (badge "Frota 100% em dia" ilegível em dark mode
  // quando o texto usava o `anchor` invertido do tema em vez de um tom escuro fixo).
  //
  // EXCEÇÃO ESCOPADA — protótipos `/dashboard/concept` (apps/web/src/app/(app)/dashboard/concept/
  // page.tsx) e `/dashboard/concept/design-system-v2` (.../design-system-v2/page.tsx): ambos usam
  // gradientes/hex literais próprios (concept: dourado→bronze `#C5A059 → #8f7038`; design-system-v2:
  // paleta "Papel/Petróleo" própria), NÃO este token OKLCH, com texto escuro (~5.7:1 estimado,
  // seguro para AA/AAA em texto grande). A exceção vale só para esses dois arquivos, que são
  // provas de conceito isoladas e não consomem `gold`/`goldForeground` — nenhuma mudança de
  // comportamento em produção decorre deste comentário. Não usar como precedente para CTAs de
  // produção que consomem este token sem uma nova decisão registrada (spec/ADR).
  gold: "67.4% 0.122 86",
  goldForeground: "20.4% 0.011 261",

  success: "60% 0.15 150",
  successForeground: "98.5% 0 0",
  successPastel: "92% 0.12 150",

  // @spec SPEC-20260731-002 — recalibrado de L=75% para L=54% (fecha C-DS-01): o tom claro
  // original só atingia 1.88:1 sobre `--card` e 1.68:1 sobre `--warning-pastel` no light mode
  // (mínimo não-textual exigido é 3:1) — usado como ícone de tendência (`KpiCard`) e
  // `border`/`border-l` (`Alert`/`Badge`/`Toast`), nunca como texto. C mantido em 0.14 (era
  // 0.16) para preservar saturação percebida ao escurecer. Valor de dark mode preserva o tom
  // claro original em `darkColorChannels.warning`, pois já atingia ≥3:1 contra os fundos
  // escuros — ver `contrast.spec.ts`.
  warning: "54% 0.14 85",
  warningForeground: "15% 0 0",
  warningPastel: "92% 0.15 85",

  // @spec SPEC-20260729-001 — terracota dessaturado da direção Prata, substitui o vermelho
  // saturado anterior (H=25→32, C=0.2→0.14): mesma leitura semântica de "erro/perigo", mas sem
  // competir em intensidade com o ouro, o único acento que deve "gritar" na tela (decisão de
  // produto registrada no showcase). Sem override dark — o alerta é sempre o mesmo tom em
  // ambos os temas porque o card em que ele aparece (`Alert`/`Toast` variant="danger") já usa
  // `dangerPastel` como fundo, nunca o `background`/`card` do tema ativo diretamente (mesma
  // regra de Heller: vermelho nunca direto sobre fundo escuro).
  danger: "56.3% 0.14 32",
  // @spec SPEC-20260731-002 — unificado com a família de grafite Azul-Índigo (H=265, mesma de
  // `background`/`primaryForeground`), substitui o branco quase puro literal de Prata (97.2%
  // 0.003 248) que `SPEC-20260731-001` havia mantido por não migrar de forma segura (trocar só
  // o hue, mantendo L=97.2%, derrubava o contraste `danger`/`danger-foreground` de ~4.51:1 para
  // ~4.499:1, abaixo do piso AA). Em vez de escurecer `danger` para abrir margem — o que
  // quebraria `danger` sobre `danger-pastel` em dark mode (já operando em ~3.03:1, margem
  // mínima acima do piso não-textual de 3:1) — o ajuste ficou só em `dangerForeground`: L=97.5%
  // (era 97.2%) preserva a leitura de "branco quase puro" e atinge ~4,57:1 sobre `danger`, com
  // margem folgada acima do piso AA.
  dangerForeground: "97.5% 0.003 265",
  dangerPastel: "92% 0.06 32",

  // @spec SPEC-20260731-001 RF-04, C-DS-01 — `warning`/`success` (e `danger`/`info`) são
  // calibrados para uso como fundo de TEXTO/ícone sobre o próprio `*Pastel` da mesma família
  // (ex.: `text-warning` sobre `bg-warning-pastel`), nunca como texto direto sobre `--card`/
  // `--background` do tema ativo — contrato validado por `contrastExpectations` em
  // `apps/web/.../design-system/_lib/contrast.spec.ts` (`{token} sobre {token}-pastel`).
  info: "55.6% 0.15 240",
  infoForeground: "98.5% 0 0",
  infoPastel: "92% 0.08 240",
} as const;

/**
 * @spec SPEC-20260721-001 RF-01, RF-03
 * @spec SPEC-20260731-001 RF-02, RF-03 — dark mode da direção Azul-Índigo (valores validados em
 * `apps/web/.../design-system/_lib/tokens.ts`, `PROPOSED_TOKENS`/`GRAPHITE_SCALE`)
 * Overrides de dark mode (seletor `.dark`, aplicado pelo `next-themes`). `background` passa a
 * ser o grafite dedicado da proposta (`≈#13131A`, `graphite-10`), independente da família de
 * `primary` — antes (Prata) era um tom escurecido do próprio azul-prata. `successPastel`/
 * `warningPastel`/`dangerPastel`/`infoPastel` ganham override próprio (C-DS-02, fecha o gap
 * identificado na construção do showcase em 2026-07-30): sem ele, esses tokens caíam
 * silenciosamente no valor claro do light mode em dark mode, tornando `text-foreground` sobre
 * `bg-*-pastel` (`Alert`/`Badge`/`Toast`) quase ilegível. `accent`/`success`/`warning`/`info`
 * (sólidos) em dark seguem fora de escopo — não fazem parte da identidade de marca.
 */
export const darkColorChannels: Partial<Record<ColorToken, string>> = {
  background: "19.0% 0.014 285",
  foreground: "97.0% 0.003 265",

  card: "22.5% 0.014 285",
  cardForeground: "97.0% 0.003 265",

  border: "30% 0.014 285",

  muted: "27% 0.014 285",
  mutedForeground: "75.9% 0.018 248",

  // @spec SPEC-20260731-001 RF-02 — dark de Azul-Índigo (tom 70 da escala tonal, §3.5 da
  // proposta), mais claro que o light para funcionar como CTA/link sobre o grafite escuro.
  primary: "66% 0.16 250",
  // @spec SPEC-20260731-001 RF-02 — override explícito (não herda o `primaryForeground` claro
  // do light mode): como o `primary` de dark é claro (66% L), o texto sobre ele precisa ser
  // escuro, não claro — usa o mesmo tom do `background` de dark (grafite quase preto).
  primaryForeground: "19.0% 0.014 285",

  secondary: "62% 0.09 82",
  secondaryForeground: "19.0% 0.014 285",

  gold: "82.9% 0.12 91",
  goldForeground: "20.4% 0.011 261",

  // @spec SPEC-20260731-002 — override explícito preservando o tom claro que era o único valor
  // de `warning` antes da recalibração de light mode: já atingia ≥3:1 contra `--card`/
  // `--warning-pastel` escuros (fundos dark são muito mais escuros que L=75%), então dark mode
  // não muda de comportamento — só passa a ter override próprio em vez de herdar o light.
  warning: "75% 0.16 85",

  // @spec SPEC-20260731-001 RF-03, C-DS-02 — overrides antes ausentes; valores mantêm o hue de
  // cada família, escurecidos para que `text-foreground` (claro em dark) leia ~13:1 (AAA) sobre
  // o fundo, em vez do valor claro herdado do light mode.
  successPastel: "28% 0.09 150",
  warningPastel: "30% 0.10 85",
  dangerPastel: "28% 0.05 32",
  infoPastel: "28% 0.06 240",
};

export type ColorToken = keyof typeof colorChannels;

/** Nomes das variáveis CSS geradas em `:root` a partir de {@link colorChannels}. */
export function cssVariableName(token: ColorToken): string {
  return `--${token.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}
