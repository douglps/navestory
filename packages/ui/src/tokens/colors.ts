/**
 * @spec SPEC-20260525-001 §4.1
 * @spec SPEC-20260729-001 RF-01 — paleta de marca substituída pela direção Prata
 * Fonte da verdade dos tokens de cor. Valores em canais OKLCH ("L C H", sem a função
 * `oklch()` em volta) para permitir modificador de opacidade do Tailwind
 * (`oklch(var(--x) / <alpha-value>)` em tailwind.config.ts, ex: `bg-primary/50`).
 *
 * Paleta de marca (background/foreground/card/border/muted/primary/secondary/gold/danger)
 * substituída pela direção "Prata" (`apps/web/.../brand-showcase/_data/directions.ts`,
 * slug `prata`), adotada em SPEC-20260729-001 — construída sobre pesquisa empírica de
 * psicologia das cores (Eva Heller) em vez de tendência de mercado: acorde azul-prata-cinza
 * ("a cor da tecnologia e da funcionalidade"), grafite nunca preto puro, ouro isolado como
 * único acento decorativo, alerta em terracota dessaturado (nunca vermelho puro). Valores
 * convertidos dos hex validados do showcase para OKLCH — ver spec para a tabela de conversão
 * e os contrastes recalculados. `accent` (verde, H=140) nunca teve consumidor em `packages/ui`
 * e permanece intocado — R-DS-03 já proíbe introduzir nova família decorativa, e Prata não
 * define esse papel. `success`/`warning`/`info` são semânticos, não de marca — fora de escopo.
 * Os tons "solid" de success/warning/danger/info continuam calibrados para contraste sobre o
 * `-pastel` da mesma família, não sobre `--card`/`--background` (ver `kpi-card.tsx`).
 */
export const colorChannels = {
  // @spec SPEC-20260729-001 RF-01 — `surface` da direção Prata (substitui o canvas quente de
  // SPEC-20260722-002, que fica deprecated/superseded_by esta spec): acorde azul-prata-cinza
  // frio, não mais quente (H=80→248).
  background: "97.2% 0.003 248",
  foreground: "20.4% 0.011 261",

  card: "92.6% 0.007 248",
  cardForeground: "20.4% 0.011 261",

  border: "88.5% 0.007 248",

  muted: "92.6% 0.007 248",
  // @spec SPEC-20260729-001 — L=50.4% (era 42%): o teto de L≤42% era calibrado para o par
  // acromático anterior, não é o requisito em si. C-DS-01 exige razão de contraste ≥4.5:1, que
  // este tom (`ink-muted` de Prata) atinge sobre o novo `background` (~5.2:1 light, ~6.8:1
  // dark) — validado em `contrastExpectations` do showcase e revalidado por `jest-axe` aqui.
  mutedForeground: "50.4% 0.021 246",

  primary: "35.3% 0.093 259",
  primaryForeground: "97.2% 0.003 248",

  // @spec SPEC-20260729-001 — tom estrutural derivado (não faz parte literal da paleta Prata,
  // que não define um segundo matiz saturado): tinta neutra na mesma família de `primary`,
  // reforçando o acorde monocromático em vez de introduzir hue nova. Sem consumidor em
  // `packages/ui` hoje (grep confirmado) — fica pronto para uso futuro sem risco de regressão.
  secondary: "75% 0.03 255",
  secondaryForeground: "20.4% 0.011 261",

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

  warning: "75% 0.16 85",
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
  dangerForeground: "97.2% 0.003 248",
  dangerPastel: "92% 0.06 32",

  info: "55.6% 0.15 240",
  infoForeground: "98.5% 0 0",
  infoPastel: "92% 0.08 240",
} as const;

/**
 * @spec SPEC-20260721-001 RF-01, RF-03
 * @spec SPEC-20260729-001 RF-01 — dark mode da direção Prata (valores hex já validados no
 * showcase, convertidos para OKLCH; `contrastExpectations` do showcase confirmam AA/AAA)
 * Overrides de dark mode (seletor `.dark`, aplicado pelo `next-themes`). `secondary` ganhou
 * override porque a direção Prata define seu dark explicitamente (diferente da paleta
 * anterior); `accent`/`success`/`warning`/`info` em dark seguem fora de escopo (não fazem
 * parte da identidade de marca substituída) — ver "Fora de Escopo" em SPEC-20260729-001.
 */
export const darkColorChannels: Partial<Record<ColorToken, string>> = {
  background: "20.4% 0.011 261",
  foreground: "95.1% 0.005 258",

  card: "27.5% 0.016 260",
  cardForeground: "95.1% 0.005 258",

  border: "34% 0.016 260",

  muted: "32.5% 0.016 260",
  mutedForeground: "75.9% 0.018 248",

  // @spec SPEC-20260729-002 — chroma reforçada (era 0.038, fiel ao valor literal do showcase
  // Prata) para funcionar melhor como cor de botão/link real em dark mode.
  primary: "68% 0.11 254",

  secondary: "30% 0.03 255",
  secondaryForeground: "95.1% 0.005 258",

  gold: "82.9% 0.12 91",
  goldForeground: "20.4% 0.011 261",
};

export type ColorToken = keyof typeof colorChannels;

/** Nomes das variáveis CSS geradas em `:root` a partir de {@link colorChannels}. */
export function cssVariableName(token: ColorToken): string {
  return `--${token.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}
