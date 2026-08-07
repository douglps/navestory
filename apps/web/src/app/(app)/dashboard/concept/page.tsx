"use client";

/**
 * Cópia experimental do dashboard (`/dashboard`) aplicando um template de design system
 * inspirado na referência visual fornecida pelo usuário (image.png — dark UI "Energy Flow",
 * cartões translúcidos, acento laranja, gauges circulares).
 *
 * Protótipo/prova de conceito de exploração visual — processo de spec/ADR não se aplica
 * (ver "Quando aplicar o processo completo" em .claude/CLAUDE.md). Reutiliza os mesmos hooks
 * de dados de `/dashboard/page.tsx`, apenas com uma casca visual nova.
 *
 * v2 (revisão de design): paleta de marca "Mostarda Dark" (`#1A1D20`/`#112240`/`#C5A059`, regra
 * 60-30-10), tema claro e escuro via `next-themes` (não mais "ilha escura" isolada — ver
 * `ThemeToggle` na `NavBar`), painel "Fluxo de Frota" (curvas SVG) substituído por uma timeline de
 * próximos eventos, ícones reais (lucide-react) no lugar de emoji, tipografia tabular dedicada a
 * números de código/coluna, animação de contagem em métricas positivas (saúde, contagem de
 * veículos — nunca em valores monetários), demonstração ilustrativa de seleção múltipla de
 * veículos (padrão correto do toggle, sem lógica de comparação real ainda) e elementos visuais
 * leves de monetização (badge de plano, limite de veículos).
 *
 * v3 (auditoria Carbon Design System): focus-visible em todos os elementos interativos (ring 2px
 * dourado `#C5A059`, alinhado ao Carbon `focus-outline 'outline'`); text mínimo bumped para 12px
 * (Carbon minimum type step 1 = 12px) nos textos informativos; easing do gauge atualizado para
 * Carbon standard productive `cubic-bezier(0.2, 0, 0.38, 0.9)` a 600ms; toggle thumb/track com
 * Carbon exit productive `cubic-bezier(0.2, 0, 1, 0.9)` / entrance productive
 * `cubic-bezier(0, 0, 0.38, 0.9)` a 70ms (Carbon fast01). Paleta Mostarda Dark preservada sem
 * alterações — Carbon confirmou que o sistema de borders-como-elevação e o spacing 8px grid já
 * praticados aqui são boas práticas.
 *
 * v4 (fundo esfumaçado + light mode mais frio, revertido em v6): tentativa de trocar o azul
 * marinho `#112240` dos cards do modo escuro por um preto frio residual `#101317` para dessaturar
 * o dark mode — desfeita em v6, ver abaixo. Sobrevive desta rodada: overlay de ruído esfumaçado
 * (`NOISE_TEXTURE` — fractal noise + blur, sem grão nítido) no fundo da página; modo claro deixou
 * de usar o creme quente `#F5F1EA`/tinta grafite `#1A1D20` e passou a compor com o azul de marca:
 * fundo `#EDF1F7` (cinza-azulado pálido), tinta de texto `#101B2E` (quase-preto puro navy) e todas
 * as bordas/preenchimentos neutros do modo claro (antes `black/NN`) recodificados para
 * `#112240/NN`.
 *
 * v5 (raio de borda reduzido + azul finalmente visível): `rounded-2xl/xl/lg` recuados um degrau
 * cada (2xl→xl→lg→md) em cascata controlada — cantos menos arredondados em toda a hierarquia,
 * `rounded-full` preservado só onde é semântico (pílulas, toggle, avatar). O marinho `#112240` em
 * opacidade baixa (`/10`, `/5`) sobre o fundo `#EDF1F7` era indistinguível de cinza — tom escuro
 * diluído não registra matiz ao olho em áreas finas; corrigido trocando bordas translúcidas por
 * preenchimento **sólido** em áreas grandes o bastante para o azul aparecer de fato: faixa de
 * acento de 4px no topo dos dois cards principais, ícone de "Despesas do mês" (antes gradiente
 * dourado) e chip da placa do veículo agora em `bg-[var(--navy-90)]` sólido com texto branco.
 *
 * v6 (retorno ao azul original nos cards do modo escuro): revertido o `#101317` de v4 — os cards
 * do modo escuro (`dark:bg-[var(--graphite-card)]`) e os `ring-offset` associados voltam ao azul marinho
 * original da paleta Mostarda Dark, como antes da rodada de "fundo em tom de preto".
 *
 * v8 (polimento pontual): ícone de "Despesas do mês" trocado de `Zap` (não relacionado ao
 * conteúdo) para `Wallet` preenchido (`fillOpacity`), container em gradiente `navy-80→navy-90`
 * em vez de navy sólido chapado — leitura mais suave. Placa do veículo redesenhada como réplica
 * simplificada do padrão Mercosul (faixa `navy-60` com "BRASIL" + corpo branco com a placa em
 * preto) em vez do chip navy genérico. Borda superior de acento reduzida de 4px para 2px (estava
 * pesada demais). Toggle de comparação (`MultiSelectDemo`): estado desligado agora usa azul
 * translúcido de verdade (`bg-[var(--navy-90)]/20` — opacidade sobre o anchor escuro, não um
 * degrau pálido sólido) e o estado ligado usa `GOLD_VIVID` (`#E2A936`, mais saturado que
 * `GOLD[50]`) — o dourado de marca é contido demais para servir de sinal de "ativo". "Custo por
 * km" voltou à tinta neutra (`navy-100`/branco) em vez do dourado, que competia visualmente com o
 * dourado reservado para CTAs/estado ativo.
 *
 * v9 (contraste, ruído e reduzir alarde visual): botão "Ver manutenções" trocado do gradiente
 * dourado (contraste caía a ~3.7:1 na ponta bronze, abaixo do mínimo AA 4.5:1) para `gold-50`
 * sólido (~7:1). Fundo dos cards no modo escuro deixou de ser `NAVY[90]` e passou a
 * `GRAPHITE_CARD_DARK` (`#272B30`) — mesma família neutra do fundo de página, um degrau mais claro
 * para elevação (a faixa de acento no topo dos dois cards principais continua navy, é acento
 * deliberado, não fundo). Ruído do modo escuro um pouco mais perceptível (`opacity-[0.14]`). Bordas
 * em geral trocadas de degrau sólido pálido para navy translúcido (`navy-90/8` a `/25` conforme o
 * peso) — mais suave visualmente. Hover de linhas/botões (`hover:bg-[var(--navy-XX)]`, antes
 * sólido) virou translúcido (`navy-90/5` a `/10`). Placa ganhou `min-w-[92px]`. Texto
 * "Ativo"/"Inativo" removido; botão de status agora é só ícone, preenchido (`bg-[var(--gold-50)]`
 * ligado / `navy-90/10` desligado), menor (`h-7 w-7` em vez de `h-9 w-9`) — segue com `aria-label`
 * para acessibilidade. Chips de alerta no painel de eventos: filtrados para `urgentAlerts`
 * (`type.endsWith("_overdue")` — só o que já venceu, não lembretes `_upcoming` de rotina) e com
 * opacidade reduzida (menos "gritante", reservado para o que é de fato urgente). Badge "Grátis ·
 * Beta" removido do cabeçalho (cluster logo + "navestory").
 *
 * v10 (remover chrome duplicado + galeria de padrões): `NavBar` parava de fazer sentido como
 * "header" — logo, "navestory" e `ThemeToggle` já vêm do `Header` global (layout `(app)`, envolve
 * qualquer página aqui dentro, `/dashboard/concept` incluso); manter os dois era chrome duplicado,
 * não uma segunda fonte de verdade. `BRAND_GRADIENT` ficou sem uso após a remoção do logo (o botão
 * "Ver manutenções" já tinha migrado para `gold-50` sólido por contraste) — removido. Faixa de
 * acento `border-t` nos dois cards principais removida (`border-top-color` fora, borda volta a ser
 * uniforme nos 4 lados). Chips de alerta agora distinguem tipo: `document_overdue` mantém o
 * vermelho (é o que se compara a "conta atrasada"); `maintenance_overdue` (ex: revisão de freios)
 * passou a tom navy neutro — vencido não é sinônimo de emergência. Adicionada galeria de padrões de
 * UI ao final da página: `FormExample` (label + input controlado + submit), `OverlayExample`
 * (modal com backdrop, fecha em Esc/backdrop/botão), `SkeletonExample` (blocos `animate-pulse`),
 * `AnimationExample` (barra de progresso indeterminada, `@keyframes` local, respeita
 * `prefers-reduced-motion`), `DepthExample` (translateY + sombra progressiva no hover) e
 * `TooltipExample` (balão informativo acessível via `aria-describedby`, abre em hover e foco).
 *
 * v11 (galeria de padrões expandida, 28 novos itens): agrupados em 5 blocos — navegação/estrutura
 * (`BreadcrumbExample`, `TabsExample`, `PaginationExample`, `ContextMenuExample`,
 * `AccordionExample`), feedback/status (`ToastExample`, `PersistentBannerExample`,
 * `BadgeCountExample`, `DeterminateProgressExample`, `EmptyStateExample`, `ErrorStateExample`),
 * entrada de dados (`SelectExample`, `CheckboxRadioExample`, `TextareaExample`,
 * `DatePickerExample`, `FileUploadExample`, `AutocompleteExample`, `StepperExample`), exibição de
 * dados (`SortableTableExample`, `KpiTileCompactExample`, `VerticalTimelineExample`,
 * `AvatarExample`, `RemovableChipExample`) e interação (`DropdownMenuExample`, `PopoverExample`,
 * `InlineConfirmExample`, `DragReorderExample`, `ContextSwitcherExample`). Todos reaproveitam os
 * mesmos tokens (`PATTERN_INPUT_CLASS`, `PATTERN_FOCUS_RING`, `PATTERN_MUTED`,
 * `PATTERN_SECTION_TITLE`) e o critério de acessibilidade já usado nos 6 exemplos anteriores
 * (roles ARIA nativos do padrão — `tablist`/`tab`, `menu`/`menuitem`, `listbox`/`option`,
 * `progressbar`, `status` — fechamento em Esc/clique fora onde há popover, sem lógica de
 * persistência real, são só demonstração visual do padrão).
 *
 * Frentes de estudo adiadas para revisão futura (fora do escopo desta rodada):
 * - Análise comparativa multi-veículo nos gráficos (o toggle de seleção múltipla aqui é só
 *   demonstração visual do padrão, sem lógica de comparação real).
 * - Visualização alternativa ao `SemiGauge` (semicírculo) para saúde da frota.
 * - Dark mode "true black" (hoje a paleta Mostarda Dark usa `#1A1D20`, não `#000`).
 * - Tom de voz / microcopy revisado.
 * - Skeleton da galeria é ilustrativo — os `useQuery` reais da página ainda mostram "—" sem
 *   `isLoading` tratado, não usam `SkeletonExample`.
 */

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  Bell,
  Car,
  FileWarning,
  Inbox,
  Power,
  Upload,
  Wallet,
  Wrench,
} from "lucide-react";
import {
  type FleetHealthEntry,
  type FleetKpiCatalog,
  type KpiCatalogId,
  type Maintenance,
} from "@navestory/validators";
import { apiClient } from "@/lib/http/api-client";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import type { FleetAlertItem } from "@/components/dashboard/FleetAlertBar";
import type { VehicleCardData } from "@/components/dashboard/VehicleHealthCard";

const MOCK_VEHICLE_LIMIT = 5;
const TIMELINE_MAX_ITEMS = 8;
const ATTENTION_HORIZON_DAYS = 7;

/**
 * v7 (escala de tons Carbon): as cores de marca até aqui eram hex soltos escolhidos caso a caso —
 * o Carbon usa uma rampa numerada (10 = quase-branco, 100 = quase-preto) por matiz, gerada a partir
 * de um único hue/saturação em vez de tons desconexos. NAVY (H≈217°) e GOLD (H≈40°) abaixo seguem
 * essa metodologia: `NAVY[10]` e `NAVY[100]` são os hex já em uso (fundo `#EDF1F7` e tinta de texto
 * `#101B2E`), `NAVY[90]` é o azul de marca original (`#112240`, cards do modo escuro), e `GOLD[50]`/
 * `GOLD[70]` são o dourado/bronze usados no gauge e nos botões — os degraus intermediários (20-80)
 * são novos, interpolados no mesmo hue para preencher a rampa. Usos de opacidade ad hoc
 * (`bg-[#112240]/10`, `/[0.02]` etc.) foram substituídos por passos sólidos da escala — referenciados
 * via CSS custom properties (`bg-[var(--navy-20)]`, ver `TONE_CSS_VARS` abaixo), já que classes
 * Tailwind com hex literal não podem consumir o objeto JS diretamente. É assim que o Carbon resolve
 * bordas/preenchimentos sutis: não com transparência, mas com um degrau vizinho da própria rampa.
 */
const NAVY = {
  10: "#EDF1F7",
  20: "#D4DEED",
  30: "#B3C4E0",
  40: "#8CA8D4",
  50: "#6088C7",
  60: "#3A69B6",
  70: "#29508E",
  80: "#1B3764",
  90: "#112240",
  100: "#101B2E",
} as const;

const GOLD = {
  10: "#F8F4ED",
  20: "#EFE5D2",
  30: "#E3D2B0",
  40: "#D5BA86",
  50: "#C5A059",
  60: "#AF8A41",
  70: "#8f7038",
  80: "#6D572C",
  90: "#4F4022",
  100: "#352B18",
} as const;

/**
 * Dourado mais saturado que `GOLD[50]` — reservado para feedback de interação (estado "ligado" de
 * toggles), onde o dourado de marca (mais amostardado/contido, pensado para identidade) fica
 * apagado demais como sinal de estado ativo.
 */
const GOLD_VIVID = "#E2A936";

/**
 * v9: fundo dos cards no modo escuro deixou de ser o navy de marca (`NAVY[90]`) — ficava pesado e
 * competindo com o dourado. Grafite escuro, mesma família neutra do fundo de página `#1A1D20`
 * (H≈210°, S≈10%), um degrau mais claro (L≈17% vs 11%) para diferenciar camada/elevação — Carbon
 * usa exatamente essa lógica no tema escuro (layers ficam mais claras que o fundo, já que sombra
 * não funciona bem sobre preto).
 */
const GRAPHITE_CARD_DARK = "#272B30";

/**
 * Expõe NAVY/GOLD como CSS custom properties no `<main>` — classes Tailwind com hex literal
 * (`bg-[#112240]`) não podem referenciar o objeto JS diretamente (o JIT escaneia texto estático,
 * não executa código), mas `bg-[var(--navy-90)]` é texto estático válido. Em Tailwind v4 o
 * modificador de opacidade (`/50`) funciona normalmente sobre `var(...)` via `color-mix`.
 */
const TONE_CSS_VARS = {
  ...Object.fromEntries(
    Object.entries(NAVY).map(([step, hex]) => [`--navy-${step}`, hex]),
  ),
  ...Object.fromEntries(
    Object.entries(GOLD).map(([step, hex]) => [`--gold-${step}`, hex]),
  ),
  "--gold-vivid": GOLD_VIVID,
  "--graphite-card": GRAPHITE_CARD_DARK,
} as CSSProperties;

/**
 * Textura de ruído esfumaçado (SVG fractal noise + blur) aplicada como overlay de baixa opacidade
 * no fundo da página — baseFrequency baixa e feGaussianBlur produzem nuvens suaves em vez de grão
 * estático nítido; a região do filtro é expandida (x/y/width/height) para o blur não cortar bordas.
 */
const NOISE_TEXTURE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n' x='-20%25' y='-20%25' width='140%25' height='140%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='4' seed='7' stitchTiles='stitch'/%3E%3CfeGaussianBlur stdDeviation='6'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 3 -0.6'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

interface TimelineEvent {
  id: string;
  kind: "maintenance" | "document";
  label: string;
  vehiclePlate: string;
  date: string | null;
  daysUntil: number;
  severity: "ok" | "attention" | "overdue";
}

function vehicleLabel(vehicle: VehicleCardData): string {
  return (
    vehicle.nickname ??
    (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate)
  );
}

function currency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("pt-BR");
}

function daysUntilDate(dateStr: string): number {
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - startOfToday.getTime()) / 86_400_000);
}

function severityFromDays(days: number): TimelineEvent["severity"] {
  if (days < 0) return "overdue";
  if (days <= ATTENTION_HORIZON_DAYS) return "attention";
  return "ok";
}

function relativeLabel(days: number): string {
  if (days < 0) {
    const n = Math.abs(days);
    return `Venceu há ${n} ${n === 1 ? "dia" : "dias"}`;
  }
  if (days === 0) return "Hoje";
  return `Em ${days} ${days === 1 ? "dia" : "dias"}`;
}

const SEVERITY_DOT: Record<TimelineEvent["severity"], string> = {
  ok: "bg-[#2F7D4F] dark:bg-[#66C493]",
  attention: "bg-[#A8632E] dark:bg-[#c98a53]",
  overdue: "bg-[#B3261E] dark:bg-[#E2685A]",
};

/**
 * Animação de contagem para métricas positivas (score de saúde, contagem de veículos) — nunca
 * usada em valores monetários (o usuário precisa ler o custo, não assistir ele "subir"). Sobe do
 * valor anterior ao novo em ~700ms com easing, e é pulada por completo quando o sistema tem
 * `prefers-reduced-motion: reduce` ativo. A leitura de `matchMedia` fica presa a `useEffect` (nunca
 * durante o render) para não quebrar SSR.
 */
function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setValue(target);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    const to = target;
    if (from === to) return;

    const start = performance.now();
    function tick(now: number): void {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}

/** Gauge semicircular — trilho reage ao tema (claro/escuro), preenchimento sempre no gradiente de marca. */
function SemiGauge({
  value,
  label,
  isDark,
}: {
  value: number;
  label: string;
  isDark: boolean;
}): ReactNode {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 90;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const trackColor = isDark ? "#2a2a30" : "#e7ded0";

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 200 110"
        className="w-full max-w-[260px]"
        role="img"
        aria-label={`${label}: ${Math.round(clamped)}%`}
      >
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          fill="none"
          stroke={trackColor}
          strokeWidth={14}
          strokeLinecap="round"
        />
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          // Carbon standard productive easing — movimento perceptível sem ser excessivo
          style={{
            transition:
              "stroke-dashoffset 600ms cubic-bezier(0.2, 0, 0.38, 0.9)",
          }}
        />
        <defs>
          <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={GOLD[50]} />
            <stop offset="100%" stopColor={GOLD[70]} />
          </linearGradient>
        </defs>
      </svg>
      <div aria-hidden="true" className="-mt-10 flex flex-col items-center">
        <span className="font-mono text-4xl font-bold tracking-tight tabular-nums text-[var(--navy-100)] dark:text-white">
          {Math.round(clamped)}%
        </span>
      </div>
      <div className="mt-3 flex w-full max-w-[260px] justify-between text-xs uppercase tracking-wide text-[var(--navy-100)]/50 dark:text-white/45">
        <span>0%</span>
        <span>{label}</span>
        <span>100%</span>
      </div>
    </div>
  );
}

/** Timeline cronológica de próximos eventos — substitui o painel "Fluxo de Frota" removido. */
function EventTimeline({ events }: { events: TimelineEvent[] }): ReactNode {
  if (events.length === 0) {
    return (
      <p className="text-sm text-[var(--navy-100)]/55 dark:text-white/45">
        Nenhum evento próximo.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-[var(--navy-90)]/5 dark:hover:bg-white/5"
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[event.severity]}`}
          />
          {event.kind === "maintenance" ? (
            <Wrench
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-[var(--navy-100)]/50 dark:text-white/45"
            />
          ) : (
            <FileWarning
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-[var(--navy-100)]/50 dark:text-white/45"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--navy-100)] dark:text-white">
              {event.label}
            </p>
            <p className="font-mono text-xs tabular-nums text-[var(--navy-100)]/55 dark:text-white/45">
              {event.vehiclePlate}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--navy-100)]/60 dark:text-white/55">
              {relativeLabel(event.daysUntil)}
            </p>
            {event.date && (
              <p className="font-mono text-xs tabular-nums text-[var(--navy-100)]/40 dark:text-white/35">
                {formatDate(event.date)}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Demonstração ilustrativa do padrão correto de seleção múltipla (a chave/toggle do protótipo
 * antigo era usada para trocar o item em foco de uma lista — affordance errada; a semântica
 * decidida é "incluir este veículo numa seleção múltipla para análise comparativa"). É só UI local
 * (`useState<Set<string>>`), sem lógica real de comparação de gráficos — isso fica para a frente de
 * estudo "análise multi-veículo" registrada no topo do arquivo.
 */
function MultiSelectDemo({
  vehicles,
}: {
  vehicles: VehicleCardData[];
}): ReactNode {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const sample = vehicles.slice(0, 3);

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (sample.length === 0) return null;

  return (
    <div>
      <div className="flex flex-col gap-1">
        {sample.map((vehicle) => {
          const checked = selected.has(vehicle.id);
          return (
            <button
              key={vehicle.id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => toggle(vehicle.id)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-[var(--navy-90)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-50)] focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:hover:bg-white/5 dark:focus-visible:ring-offset-[var(--graphite-card)]"
            >
              <span className="truncate text-sm text-[var(--navy-100)] dark:text-white/85">
                {vehicleLabel(vehicle)}
              </span>
              <span
                aria-hidden="true"
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-[70ms] ease-[cubic-bezier(0.2,0,1,0.9)] ${
                  checked
                    ? "bg-[var(--gold-vivid)]"
                    : "bg-[var(--navy-90)]/20 dark:bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[left] duration-[70ms] ease-[cubic-bezier(0,0,0.38,0.9)] ${
                    checked ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs uppercase tracking-wide text-[var(--navy-100)]/45 dark:text-white/40">
        {selected.size > 1
          ? `Comparando ${selected.size} veículos`
          : "Selecione 2+ para comparar (demonstração)"}
      </p>
    </div>
  );
}

const PATTERN_INPUT_CLASS =
  "rounded-md border border-[var(--navy-90)]/15 bg-white px-3 py-2 text-sm text-[var(--navy-100)] outline-none transition focus-visible:border-[var(--gold-50)] focus-visible:ring-2 focus-visible:ring-[var(--gold-50)]/40 dark:border-white/12 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30";

const PATTERN_FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-50)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[var(--graphite-card)]";

const PATTERN_MUTED = "text-[var(--navy-100)]/55 dark:text-white/45";

const PATTERN_SECTION_TITLE =
  "mb-4 text-sm font-bold uppercase tracking-wide text-[var(--navy-100)]/70 dark:text-white/70";

/** Padrão de formulário: label + input controlado + submit, mesmos tokens de foco do resto da página. */
function FormExample(): ReactNode {
  const [nickname, setNickname] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(nickname.trim() || "—");
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label
          htmlFor="concept-nickname"
          className="text-xs font-semibold uppercase tracking-wide text-[var(--navy-100)]/60 dark:text-white/50"
        >
          Apelido do veículo
        </label>
        <input
          id="concept-nickname"
          type="text"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Ex: Gol do trabalho"
          className={PATTERN_INPUT_CLASS}
        />
      </div>
      <button
        type="submit"
        className="self-start rounded-full bg-[var(--gold-50)] px-4 py-1.5 text-xs font-semibold text-[var(--navy-100)] transition hover:bg-[var(--gold-vivid)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-50)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[var(--graphite-card)]"
      >
        Salvar
      </button>
      {submitted && (
        <p className="text-xs text-[var(--navy-100)]/60 dark:text-white/50">
          Salvo: &ldquo;{submitted}&rdquo; (demonstração — não persiste).
        </p>
      )}
    </form>
  );
}

/** Padrão de overlay: modal com backdrop, fecha no backdrop/Esc/botão, foco preso ao título via `aria-labelledby`. */
function OverlayExample(): ReactNode {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-full border border-[var(--navy-90)]/15 px-4 py-1.5 text-xs font-medium text-[var(--navy-100)]/80 transition hover:bg-[var(--navy-90)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-50)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/12 dark:text-white/75 dark:hover:bg-white/5 dark:focus-visible:ring-offset-[var(--graphite-card)]"
      >
        Abrir overlay
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="concept-overlay-title"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-xl border border-[var(--navy-90)]/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[var(--graphite-card)]">
            <h3
              id="concept-overlay-title"
              className="text-sm font-bold text-[var(--navy-100)] dark:text-white"
            >
              Confirmar ação
            </h3>
            <p className="mt-2 text-sm text-[var(--navy-100)]/70 dark:text-white/60">
              Exemplo de overlay — fecha no backdrop, em Esc ou nos botões
              abaixo.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[var(--navy-90)]/15 px-3 py-1.5 text-xs font-medium text-[var(--navy-100)]/70 dark:border-white/12 dark:text-white/70"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-[var(--gold-50)] px-3 py-1.5 text-xs font-semibold text-[var(--navy-100)]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Padrão de skeleton: blocos pulsantes no lugar de conteúdo ainda não carregado. */
function SkeletonExample(): ReactNode {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--navy-90)]/10 dark:bg-white/10" />
      <div className="h-4 w-full animate-pulse rounded bg-[var(--navy-90)]/10 dark:bg-white/10" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--navy-90)]/10 dark:bg-white/10" />
    </div>
  );
}

/**
 * Padrão de animação: barra de progresso indeterminada. `@keyframes` local (não precisa entrar na
 * config global do Tailwind para um único uso de POC) — respeita `prefers-reduced-motion` via
 * media query dedicada, mesmo critério do `useCountUp`.
 */
function AnimationExample(): ReactNode {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--navy-90)]/10 dark:bg-white/10">
      <style>{`
        @keyframes concept-slide { 0% { transform: translateX(-100%); } 50% { transform: translateX(220%); } 100% { transform: translateX(-100%); } }
        .concept-slide-bar { animation: concept-slide 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .concept-slide-bar { animation: none; } }
      `}</style>
      <div className="concept-slide-bar h-full w-1/3 rounded-full bg-[var(--gold-50)]" />
    </div>
  );
}

/** Padrão de profundidade: leve elevação (translateY + sombra progressiva) no hover. */
function DepthExample(): ReactNode {
  return (
    <div className="rounded-lg border border-[var(--navy-90)]/8 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-white/8 dark:bg-[var(--graphite-card)] dark:shadow-none dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.35)]">
      <p className="text-sm font-medium text-[var(--navy-100)] dark:text-white">
        Passe o mouse aqui
      </p>
      <p className="mt-1 text-xs text-[var(--navy-100)]/55 dark:text-white/45">
        translateY + sombra progressiva no hover.
      </p>
    </div>
  );
}

/** Padrão de balão informativo: ícone "?" com tooltip acessível (hover + foco via teclado). */
function TooltipExample(): ReactNode {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-[var(--navy-100)] dark:text-white">
      Cobertura do seguro
      <span className="group relative inline-flex">
        <button
          type="button"
          aria-describedby="concept-tooltip"
          className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--navy-90)]/10 text-[10px] font-bold leading-none text-[var(--navy-100)]/70 outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-50)] dark:bg-white/10 dark:text-white/60"
        >
          ?
        </button>
        <span
          id="concept-tooltip"
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-md bg-[var(--navy-100)] px-2 py-1.5 text-[11px] font-normal normal-case text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 dark:border dark:border-white/10 dark:bg-[var(--graphite-card)]"
        >
          Cobre colisão, roubo e terceiros. Franquia de R$ 1.200.
        </span>
      </span>
    </span>
  );
}

/** Trilha de navegação — último item é a página atual (`aria-current="page"`), não é link. */
function BreadcrumbExample(): ReactNode {
  const items = [
    { label: "Frota", href: "#" },
    { label: "Veículos", href: "#" },
    { label: "Gol do trabalho", href: null },
  ];
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1 text-sm"
    >
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1">
          {i > 0 && (
            <span aria-hidden="true" className={PATTERN_MUTED}>
              /
            </span>
          )}
          {item.href ? (
            <a
              href={item.href}
              onClick={(event) => event.preventDefault()}
              className={`rounded-sm text-[var(--navy-100)]/60 transition hover:text-[var(--navy-100)] dark:text-white/50 dark:hover:text-white ${PATTERN_FOCUS_RING}`}
            >
              {item.label}
            </a>
          ) : (
            <span
              aria-current="page"
              className="font-medium text-[var(--navy-100)] dark:text-white"
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Abas de conteúdo — `role="tablist"`/`"tab"` nativos, painel único trocado por `aria-selected`. */
function TabsExample(): ReactNode {
  const tabs = ["Resumo", "Despesas", "Documentos"];
  const [active, setActive] = useState(0);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Detalhes do veículo"
        className="flex gap-1 border-b border-[var(--navy-90)]/10 dark:border-white/10"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`-mb-px rounded-t-md border-b-2 px-3 py-1.5 text-sm font-medium transition ${PATTERN_FOCUS_RING} ${
              active === i
                ? "border-[var(--gold-50)] text-[var(--navy-100)] dark:text-white"
                : "border-transparent text-[var(--navy-100)]/50 hover:text-[var(--navy-100)]/80 dark:text-white/40 dark:hover:text-white/70"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <p role="tabpanel" className={`mt-3 text-sm ${PATTERN_MUTED}`}>
        {/* eslint-disable-next-line security/detect-object-injection -- active é índice numérico de useState, array estático local */}
        Conteúdo de &ldquo;{tabs[active]}&rdquo; (demonstração).
      </p>
    </div>
  );
}

/** Paginação numérica com anterior/próxima — página atual sinalizada por `aria-current="page"`. */
function PaginationExample(): ReactNode {
  const [page, setPage] = useState(1);
  const totalPages = 5;

  return (
    <nav
      aria-label="Paginação"
      className="flex items-center justify-between text-sm"
    >
      <button
        type="button"
        disabled={page === 1}
        onClick={() => setPage((p) => p - 1)}
        className={`rounded-md px-2 py-1 font-medium text-[var(--navy-100)]/70 transition hover:bg-[var(--navy-90)]/5 disabled:opacity-30 disabled:hover:bg-transparent dark:text-white/60 dark:hover:bg-white/5 ${PATTERN_FOCUS_RING}`}
      >
        ← Anterior
      </button>
      <div className="flex gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPage(n)}
            aria-current={page === n ? "page" : undefined}
            className={`h-7 w-7 rounded-full font-mono text-xs tabular-nums transition ${PATTERN_FOCUS_RING} ${
              page === n
                ? "bg-[var(--gold-50)] text-[var(--navy-100)]"
                : "text-[var(--navy-100)]/60 hover:bg-[var(--navy-90)]/5 dark:text-white/50 dark:hover:bg-white/5"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => setPage((p) => p + 1)}
        className={`rounded-md px-2 py-1 font-medium text-[var(--navy-100)]/70 transition hover:bg-[var(--navy-90)]/5 disabled:opacity-30 disabled:hover:bg-transparent dark:text-white/60 dark:hover:bg-white/5 ${PATTERN_FOCUS_RING}`}
      >
        Próxima →
      </button>
    </nav>
  );
}

/** Menu de contexto acionado por "⋮" — fecha ao clicar fora (`mousedown` fora do container). */
function ContextMenuExample(): ReactNode {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node))
        setOpen(false);
    }
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const actions = ["Editar", "Duplicar", "Excluir"];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mais ações"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-[var(--navy-100)]/60 transition hover:bg-[var(--navy-90)]/5 dark:text-white/50 dark:hover:bg-white/5 ${PATTERN_FOCUS_RING}`}
      >
        ⋮
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-md border border-[var(--navy-90)]/10 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[var(--graphite-card)]"
        >
          {actions.map((action) => (
            <li key={action} role="none">
              <button
                role="menuitem"
                type="button"
                onClick={() => setOpen(false)}
                className="block w-full px-3 py-1.5 text-left text-sm text-[var(--navy-100)]/80 transition hover:bg-[var(--navy-90)]/5 dark:text-white/75 dark:hover:bg-white/5"
              >
                {action}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Conteúdo expansível — um item aberto por vez, seta gira via `aria-expanded`. */
function AccordionExample(): ReactNode {
  const items = [
    {
      q: "Como funciona a saúde da frota?",
      a: "Combina odômetro, manutenções e documentos vencidos em um score de 0 a 100.",
    },
    { q: "Posso remover um veículo?", a: "Sim, em Configurações → Veículos." },
  ];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col divide-y divide-[var(--navy-90)]/8 dark:divide-white/8">
      {items.map((item, i) => {
        const expanded = openIndex === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpenIndex(expanded ? null : i)}
              className={`flex w-full items-center justify-between py-2 text-left text-sm font-medium text-[var(--navy-100)] dark:text-white ${PATTERN_FOCUS_RING}`}
            >
              {item.q}
              <span
                aria-hidden="true"
                className={`transition-transform ${expanded ? "rotate-180" : ""}`}
              >
                ⌄
              </span>
            </button>
            {expanded && (
              <p className={`pb-2 text-sm ${PATTERN_MUTED}`}>{item.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Notificação temporária — some sozinha após 3s, `role="status"` anuncia via leitor de tela. */
function ToastExample(): ReactNode {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setVisible(true)}
        className={`self-start rounded-full border border-[var(--navy-90)]/15 px-4 py-1.5 text-xs font-medium text-[var(--navy-100)]/80 transition hover:bg-[var(--navy-90)]/5 dark:border-white/12 dark:text-white/75 dark:hover:bg-white/5 ${PATTERN_FOCUS_RING}`}
      >
        Disparar toast
      </button>
      {visible && (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--navy-90)]/10 bg-white px-3 py-2 text-sm shadow-md dark:border-white/10 dark:bg-[var(--graphite-card)]"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-[#2F7D4F] dark:bg-[#66C493]"
          />
          Despesa salva com sucesso.
        </div>
      )}
    </div>
  );
}

/** Banner de alerta persistente — diferente do toast, fica visível até ser dispensado. */
function PersistentBannerExample(): ReactNode {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <p className={`text-xs ${PATTERN_MUTED}`}>
        Banner dispensado (demonstração — recarregue para ver de novo).
      </p>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-[#A8632E]/25 bg-[#A8632E]/[0.06] p-3 dark:border-[#c98a53]/25 dark:bg-[#c98a53]/[0.08]">
      <p className="text-sm text-[#A8632E]/90 dark:text-[#c98a53]">
        O IPVA de 2 veículos vence este mês.
      </p>
      <button
        type="button"
        aria-label="Dispensar aviso"
        onClick={() => setDismissed(true)}
        className={`shrink-0 rounded-full px-1 text-[#A8632E]/70 dark:text-[#c98a53]/80 ${PATTERN_FOCUS_RING}`}
      >
        ✕
      </button>
    </div>
  );
}

/** Badge de contagem sobre ícone — notificações não lidas. */
function BadgeCountExample(): ReactNode {
  return (
    <div className="flex items-center gap-4">
      <span className="relative inline-flex">
        <Bell
          aria-hidden="true"
          className="h-6 w-6 text-[var(--navy-100)]/70 dark:text-white/60"
        />
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#B3261E] text-[9px] font-bold text-white dark:bg-[#E2685A]">
          3
        </span>
      </span>
      <span className={`text-sm ${PATTERN_MUTED}`}>3 alertas não lidos</span>
    </div>
  );
}

/** Barra de progresso determinada — percentual explícito, diferente da indeterminada já existente. */
function DeterminateProgressExample(): ReactNode {
  const value = 62;

  return (
    <div>
      <div className="flex justify-between text-xs font-semibold uppercase tracking-wide text-[var(--navy-100)]/50 dark:text-white/40">
        <span>Upload de documento</span>
        <span className="font-mono tabular-nums">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--navy-90)]/10 dark:bg-white/10"
      >
        <div
          className="h-full rounded-full bg-[var(--gold-50)] transition-[width] duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/** Estado vazio — ilustração + texto quando não há dados, com CTA de próximo passo. */
function EmptyStateExample(): ReactNode {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <Inbox
        aria-hidden="true"
        className="h-8 w-8 text-[var(--navy-100)]/25 dark:text-white/25"
      />
      <p className="text-sm font-medium text-[var(--navy-100)] dark:text-white">
        Nenhuma despesa registrada
      </p>
      <p className={`text-xs ${PATTERN_MUTED}`}>
        Adicione a primeira despesa para começar a acompanhar custos.
      </p>
      <button
        type="button"
        className={`mt-1 rounded-full bg-[var(--gold-50)] px-3 py-1.5 text-xs font-semibold text-[var(--navy-100)] ${PATTERN_FOCUS_RING}`}
      >
        Adicionar despesa
      </button>
    </div>
  );
}

/** Estado de erro com ação de retry — contador de tentativas só para dar feedback visual. */
function ErrorStateExample(): ReactNode {
  const [attempt, setAttempt] = useState(0);

  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <FileWarning
        aria-hidden="true"
        className="h-8 w-8 text-[#B3261E]/70 dark:text-[#E2685A]/80"
      />
      <p className="text-sm font-medium text-[var(--navy-100)] dark:text-white">
        Falha ao carregar dados
      </p>
      <p className={`text-xs ${PATTERN_MUTED}`}>
        Tentativa {attempt + 1} — verifique sua conexão.
      </p>
      <button
        type="button"
        onClick={() => setAttempt((a) => a + 1)}
        className={`mt-1 rounded-full border border-[var(--navy-90)]/15 px-3 py-1.5 text-xs font-medium text-[var(--navy-100)]/80 dark:border-white/12 dark:text-white/75 ${PATTERN_FOCUS_RING}`}
      >
        Tentar novamente
      </button>
    </div>
  );
}

/** Select nativo estilizado — mesmos tokens de foco do `PATTERN_INPUT_CLASS`. */
function SelectExample(): ReactNode {
  const [value, setValue] = useState("gasolina");

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor="concept-fuel"
        className="text-xs font-semibold uppercase tracking-wide text-[var(--navy-100)]/60 dark:text-white/50"
      >
        Tipo de combustível
      </label>
      <select
        id="concept-fuel"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={PATTERN_INPUT_CLASS}
      >
        <option value="gasolina">Gasolina</option>
        <option value="etanol">Etanol</option>
        <option value="diesel">Diesel</option>
        <option value="flex">Flex</option>
      </select>
    </div>
  );
}

/** Checkbox + grupo de radio — `<fieldset>`/`<legend>` nativos para o grupo. */
function CheckboxRadioExample(): ReactNode {
  const [notify, setNotify] = useState(true);
  const [freq, setFreq] = useState("mensal");

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm text-[var(--navy-100)] dark:text-white/85">
        <input
          type="checkbox"
          checked={notify}
          onChange={(event) => setNotify(event.target.checked)}
          className="h-4 w-4 rounded border-[var(--navy-90)]/25 text-[var(--gold-50)] focus-visible:ring-2 focus-visible:ring-[var(--gold-50)] dark:border-white/25"
        />
        Notificar por e-mail
      </label>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--navy-100)]/60 dark:text-white/50">
          Frequência
        </legend>
        {["semanal", "mensal"].map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 text-sm capitalize text-[var(--navy-100)] dark:text-white/85"
          >
            <input
              type="radio"
              name="concept-freq"
              value={option}
              checked={freq === option}
              onChange={() => setFreq(option)}
              className="h-4 w-4 border-[var(--navy-90)]/25 text-[var(--gold-50)] focus-visible:ring-2 focus-visible:ring-[var(--gold-50)] dark:border-white/25"
            />
            {option}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

/** Textarea controlada — mesmo padrão visual do input de texto, sem redimensionamento livre. */
function TextareaExample(): ReactNode {
  const [value, setValue] = useState("");

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor="concept-notes"
        className="text-xs font-semibold uppercase tracking-wide text-[var(--navy-100)]/60 dark:text-white/50"
      >
        Observações
      </label>
      <textarea
        id="concept-notes"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={3}
        placeholder="Ex: troca de óleo antecipada por ruído no motor"
        className={`${PATTERN_INPUT_CLASS} resize-none`}
      />
    </div>
  );
}

/** Date picker — `<input type="date">` nativo, sem lib de calendário para um caso simples. */
function DatePickerExample(): ReactNode {
  const [value, setValue] = useState("");

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor="concept-date"
        className="text-xs font-semibold uppercase tracking-wide text-[var(--navy-100)]/60 dark:text-white/50"
      >
        Data da manutenção
      </label>
      <input
        id="concept-date"
        type="date"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={PATTERN_INPUT_CLASS}
      />
    </div>
  );
}

/** Upload de arquivo com drag and drop — `<input type="file">` acessível via label, `sr-only`. */
function FileUploadExample(): ReactNode {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        setFileName(event.dataTransfer.files[0]?.name ?? null);
      }}
      className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition ${
        dragOver
          ? "border-[var(--gold-50)] bg-[var(--gold-50)]/5"
          : "border-[var(--navy-90)]/20 dark:border-white/15"
      }`}
    >
      <Upload
        aria-hidden="true"
        className="h-6 w-6 text-[var(--navy-100)]/40 dark:text-white/35"
      />
      <label
        htmlFor="concept-file"
        className={`cursor-pointer rounded-sm text-sm font-medium text-[var(--navy-100)] underline decoration-dotted dark:text-white ${PATTERN_FOCUS_RING}`}
      >
        Escolher arquivo
        <input
          id="concept-file"
          type="file"
          className="sr-only"
          onChange={(event) =>
            setFileName(event.target.files?.[0]?.name ?? null)
          }
        />
      </label>
      <p className={`text-xs ${PATTERN_MUTED}`}>
        {fileName ?? "ou arraste e solte o comprovante aqui"}
      </p>
    </div>
  );
}

/** Busca com autocomplete — `role="combobox"`/`"listbox"`, `onBlur` com delay para permitir o clique na opção. */
function AutocompleteExample(): ReactNode {
  const options = [
    "Posto Ipiranga",
    "Posto Shell",
    "Posto BR",
    "Oficina do João",
    "Concessionária VW",
  ];
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = options.filter((option) =>
    option.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative flex flex-col gap-1">
      <label
        htmlFor="concept-place"
        className="text-xs font-semibold uppercase tracking-wide text-[var(--navy-100)]/60 dark:text-white/50"
      >
        Local
      </label>
      <input
        id="concept-place"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="concept-place-listbox"
        aria-autocomplete="list"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        placeholder="Buscar posto ou oficina"
        className={PATTERN_INPUT_CLASS}
      />
      {open && query && filtered.length > 0 && (
        <ul
          id="concept-place-listbox"
          role="listbox"
          className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-md border border-[var(--navy-90)]/10 bg-white shadow-lg dark:border-white/10 dark:bg-[var(--graphite-card)]"
        >
          {filtered.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={() => {
                  setQuery(option);
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-[var(--navy-100)]/85 hover:bg-[var(--navy-90)]/5 dark:text-white/80 dark:hover:bg-white/5"
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Stepper de formulário em múltiplas etapas — indicador numerado + navegação anterior/avançar. */
function StepperExample(): ReactNode {
  const steps = ["Veículo", "Dados", "Confirmar"];
  const [step, setStep] = useState(0);

  return (
    <div>
      <ol className="flex items-center gap-2">
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs tabular-nums ${
                i <= step
                  ? "bg-[var(--gold-50)] text-[var(--navy-100)]"
                  : "bg-[var(--navy-90)]/10 text-[var(--navy-100)]/40 dark:bg-white/10 dark:text-white/40"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-xs font-medium ${i === step ? "text-[var(--navy-100)] dark:text-white" : PATTERN_MUTED}`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="h-px w-6 bg-[var(--navy-90)]/15 dark:bg-white/12"
              />
            )}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
          className={`rounded-full border border-[var(--navy-90)]/15 px-3 py-1 text-xs font-medium text-[var(--navy-100)]/70 disabled:opacity-30 dark:border-white/12 dark:text-white/65 ${PATTERN_FOCUS_RING}`}
        >
          Voltar
        </button>
        <button
          type="button"
          disabled={step === steps.length - 1}
          onClick={() => setStep((s) => s + 1)}
          className={`rounded-full bg-[var(--gold-50)] px-3 py-1 text-xs font-semibold text-[var(--navy-100)] disabled:opacity-40 ${PATTERN_FOCUS_RING}`}
        >
          Avançar
        </button>
      </div>
    </div>
  );
}

interface DemoTableRow {
  plate: string;
  type: string;
  cost: number;
}

/** Tabela com ordenação (por coluna, clique alterna asc/desc) e filtro por texto livre. */
function SortableTableExample(): ReactNode {
  const rows: DemoTableRow[] = [
    { plate: "ABC1D23", type: "Combustível", cost: 220 },
    { plate: "XYZ9K87", type: "Manutenção", cost: 540 },
    { plate: "ABC1D23", type: "Pedágio", cost: 38 },
  ];
  const [sortKey, setSortKey] = useState<keyof DemoTableRow>("cost");
  const [asc, setAsc] = useState(false);
  const [filter, setFilter] = useState("");

  const sorted = useMemo(() => {
    return rows
      .filter(
        (row) =>
          row.plate.toLowerCase().includes(filter.toLowerCase()) ||
          row.type.toLowerCase().includes(filter.toLowerCase()),
      )
      .sort((a, b) => {
        const cmp =
          // eslint-disable-next-line security/detect-object-injection -- sortKey é keyof DemoTableRow, união fechada de chaves conhecidas
          a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0;
        return asc ? cmp : -cmp;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sortKey, asc]);

  function toggleSort(key: keyof DemoTableRow): void {
    if (sortKey === key) setAsc((prev) => !prev);
    else {
      setSortKey(key);
      setAsc(true);
    }
  }

  const columns: { key: keyof DemoTableRow; label: string }[] = [
    { key: "plate", label: "Placa" },
    { key: "type", label: "Tipo" },
    { key: "cost", label: "Custo" },
  ];

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filtrar..."
        className={`${PATTERN_INPUT_CLASS} mb-2 w-full`}
      />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--navy-90)]/10 dark:border-white/10">
            {columns.map((col) => (
              <th key={col.key} scope="col" className="pb-1.5 text-left">
                <button
                  type="button"
                  onClick={() => toggleSort(col.key)}
                  className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--navy-100)]/60 dark:text-white/50 ${PATTERN_FOCUS_RING}`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span aria-hidden="true">{asc ? "↑" : "↓"}</span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              className="border-b border-[var(--navy-90)]/5 last:border-0 dark:border-white/5"
            >
              <td className="py-1.5 font-mono tabular-nums">{row.plate}</td>
              <td className="py-1.5">{row.type}</td>
              <td className="py-1.5 font-mono tabular-nums">
                {currency(row.cost)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Card de estatística compacto — variação mais densa do KPI tile já usado no spotlight. */
function KpiTileCompactExample(): ReactNode {
  const kpis = [
    { label: "Veículos", value: "5" },
    { label: "Km/mês", value: "1.240" },
    { label: "Custo/km", value: "R$0,82" },
  ];

  return (
    <div className="flex gap-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="flex flex-1 flex-col gap-0.5 rounded-md border border-[var(--navy-90)]/8 bg-[var(--navy-20)] px-3 py-2 dark:border-white/8 dark:bg-white/5"
        >
          <span className="font-mono text-lg font-bold tabular-nums text-[var(--navy-100)] dark:text-white">
            {kpi.value}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-[var(--navy-100)]/50 dark:text-white/40">
            {kpi.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Timeline vertical com linha de conexão — diferente da `EventTimeline` (lista de próximos eventos). */
function VerticalTimelineExample(): ReactNode {
  const events = [
    { label: "Veículo cadastrado", date: "10/01/2026" },
    { label: "Troca de óleo", date: "22/03/2026" },
    { label: "IPVA pago", date: "05/05/2026" },
  ];

  return (
    <ol className="relative flex flex-col gap-4 border-l border-[var(--navy-90)]/15 pl-4 dark:border-white/12">
      {events.map((event) => (
        <li key={event.label} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--gold-50)]"
          />
          <p className="text-sm font-medium text-[var(--navy-100)] dark:text-white">
            {event.label}
          </p>
          <p className={`font-mono text-xs tabular-nums ${PATTERN_MUTED}`}>
            {event.date}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Avatar/iniciais de usuário — fallback textual, sem depender de foto de perfil. */
function AvatarExample(): ReactNode {
  const users = [{ name: "Douglas Lopes" }, { name: "Ana Silva" }];

  function initials(name: string): string {
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  return (
    <div className="flex items-center gap-3">
      {users.map((user) => (
        <span
          key={user.name}
          title={user.name}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--navy-80)] text-xs font-bold text-white"
        >
          {initials(user.name)}
        </span>
      ))}
      <span className={`text-sm ${PATTERN_MUTED}`}>2 colaboradores</span>
    </div>
  );
}

/** Chip removível — tag com "x" para excluir, útil para filtros ativos ou tags de veículo. */
function RemovableChipExample(): ReactNode {
  const [tags, setTags] = useState(["Frota SP", "Uso comercial", "Financiado"]);

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1.5 rounded-full bg-[var(--navy-90)]/10 px-3 py-1 text-xs font-medium text-[var(--navy-100)] dark:bg-white/10 dark:text-white/80"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remover ${tag}`}
            onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
            className={`rounded-full text-[var(--navy-100)]/50 hover:text-[var(--navy-100)] dark:text-white/40 dark:hover:text-white ${PATTERN_FOCUS_RING}`}
          >
            ✕
          </button>
        </span>
      ))}
      {tags.length === 0 && (
        <p className={`text-xs ${PATTERN_MUTED}`}>Nenhuma tag.</p>
      )}
    </div>
  );
}

/** Dropdown de ações — trigger com texto ("Ações ▾"), diferente do menu de contexto (ícone "⋮"). */
function DropdownMenuExample(): ReactNode {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node))
        setOpen(false);
    }
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1 rounded-full border border-[var(--navy-90)]/15 px-3 py-1.5 text-xs font-medium text-[var(--navy-100)]/80 transition hover:bg-[var(--navy-90)]/5 dark:border-white/12 dark:text-white/75 dark:hover:bg-white/5 ${PATTERN_FOCUS_RING}`}
      >
        Ações <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute left-0 z-10 mt-1 w-40 overflow-hidden rounded-md border border-[var(--navy-90)]/10 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[var(--graphite-card)]"
        >
          {["Exportar CSV", "Arquivar", "Excluir"].map((action) => (
            <li key={action} role="none">
              <button
                role="menuitem"
                type="button"
                onClick={() => setOpen(false)}
                className="block w-full px-3 py-1.5 text-left text-sm text-[var(--navy-100)]/80 hover:bg-[var(--navy-90)]/5 dark:text-white/75 dark:hover:bg-white/5"
              >
                {action}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Popover com conteúdo rico — diferente do `TooltipExample` (só texto curto, hover/foco). */
function PopoverExample(): ReactNode {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node))
        setOpen(false);
    }
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`rounded-full border border-[var(--navy-90)]/15 px-3 py-1.5 text-xs font-medium text-[var(--navy-100)]/80 dark:border-white/12 dark:text-white/75 ${PATTERN_FOCUS_RING}`}
      >
        Detalhes do plano
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute left-0 z-10 mt-1 w-64 rounded-lg border border-[var(--navy-90)]/10 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[var(--graphite-card)]"
        >
          <p className="text-sm font-bold text-[var(--navy-100)] dark:text-white">
            Plano Grátis
          </p>
          <p className={`mt-1 text-xs ${PATTERN_MUTED}`}>
            Até 5 veículos, histórico de 12 meses, sem exportação avançada.
          </p>
          <Link
            href="/settings/account"
            className="mt-2 inline-block text-xs font-semibold text-[var(--gold-60)] hover:underline"
          >
            Ver planos →
          </Link>
        </div>
      )}
    </div>
  );
}

/** Confirmação inline — botão vira "tem certeza?" no próprio lugar, sem abrir modal. */
function InlineConfirmExample(): ReactNode {
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);

  if (deleted) {
    return (
      <p className={`text-sm ${PATTERN_MUTED}`}>
        Item removido (demonstração).
      </p>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[var(--navy-100)] dark:text-white/85">
          Tem certeza?
        </span>
        <button
          type="button"
          onClick={() => setDeleted(true)}
          className={`rounded-full bg-[#B3261E] px-2.5 py-1 text-xs font-semibold text-white dark:bg-[#E2685A] ${PATTERN_FOCUS_RING}`}
        >
          Excluir
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className={`rounded-full border border-[var(--navy-90)]/15 px-2.5 py-1 text-xs font-medium text-[var(--navy-100)]/70 dark:border-white/12 dark:text-white/65 ${PATTERN_FOCUS_RING}`}
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className={`rounded-full border border-[var(--navy-90)]/15 px-3 py-1.5 text-xs font-medium text-[var(--navy-100)]/80 dark:border-white/12 dark:text-white/75 ${PATTERN_FOCUS_RING}`}
    >
      Excluir despesa
    </button>
  );
}

/** Drag and drop para reordenar itens — HTML5 DnD nativo, sem lib externa para uma lista simples. */
function DragReorderExample(): ReactNode {
  const [items, setItems] = useState([
    "Combustível",
    "Manutenção",
    "Documentos",
  ]);
  const dragIndex = useRef<number | null>(null);

  function onDrop(targetIndex: number): void {
    const from = dragIndex.current;
    if (from === null || from === targetIndex) return;
    setItems((prev) => {
      const next = [...prev];
      const moved = next.splice(from, 1)[0];
      if (moved === undefined) return prev;
      next.splice(targetIndex, 0, moved);
      return next;
    });
    dragIndex.current = null;
  }

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item, i) => (
        <li
          key={item}
          draggable
          onDragStart={() => {
            dragIndex.current = i;
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => onDrop(i)}
          className="flex cursor-grab items-center gap-2 rounded-md border border-[var(--navy-90)]/10 bg-[var(--navy-20)] px-3 py-2 text-sm text-[var(--navy-100)] active:cursor-grabbing dark:border-white/10 dark:bg-white/5 dark:text-white/85"
        >
          <span
            aria-hidden="true"
            className="text-[var(--navy-100)]/30 dark:text-white/25"
          >
            ⠿
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Context switcher — troca rápida entre veículos, mesmo `role="listbox"`/`"option"` do autocomplete. */
function ContextSwitcherExample({
  vehicles,
}: {
  vehicles: VehicleCardData[];
}): ReactNode {
  const sample = vehicles.slice(0, 3);
  const [activeId, setActiveId] = useState(sample[0]?.id);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node))
        setOpen(false);
    }
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const firstVehicle = sample[0];
  if (firstVehicle === undefined)
    return (
      <p className={`text-sm ${PATTERN_MUTED}`}>Nenhum veículo cadastrado.</p>
    );
  const active =
    sample.find((vehicle) => vehicle.id === activeId) ?? firstVehicle;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-2 rounded-full border border-[var(--navy-90)]/15 px-3 py-1.5 text-xs font-medium text-[var(--navy-100)]/80 dark:border-white/12 dark:text-white/75 ${PATTERN_FOCUS_RING}`}
      >
        <Car aria-hidden="true" className="h-3.5 w-3.5" />
        {vehicleLabel(active)}
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 z-10 mt-1 w-48 overflow-hidden rounded-md border border-[var(--navy-90)]/10 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[var(--graphite-card)]"
        >
          {sample.map((vehicle) => (
            <li key={vehicle.id} role="none">
              <button
                role="option"
                aria-selected={vehicle.id === activeId}
                type="button"
                onClick={() => {
                  setActiveId(vehicle.id);
                  setOpen(false);
                }}
                className="block w-full truncate px-3 py-1.5 text-left text-sm text-[var(--navy-100)]/85 hover:bg-[var(--navy-90)]/5 dark:text-white/80 dark:hover:bg-white/5"
              >
                {vehicleLabel(vehicle)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Sem logo/"navestory"/toggle de tema aqui — o `Header` global (`src/components/layout/header.tsx`, já
 * renderizado pelo layout `(app)` que envolve esta página) já mostra os dois; duplicar era
 * redundância de chrome, não uma segunda fonte de verdade.
 */
function NavBar({ vehicleCount }: { vehicleCount: number }): ReactNode {
  return (
    <header className="flex items-center justify-between gap-3">
      <nav className="hidden items-center gap-8 text-xs font-semibold uppercase tracking-widest text-[var(--navy-100)]/45 dark:text-white/40 md:flex">
        <span className="text-[var(--navy-100)] dark:text-white">
          Dashboard
        </span>
        <Link
          href="/analytics"
          className="rounded-sm transition hover:text-[var(--navy-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-50)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy-10)] dark:hover:text-white dark:focus-visible:ring-offset-[#1A1D20]"
        >
          Estatísticas
        </Link>
        <span className="cursor-not-allowed opacity-50">Suporte</span>
        <Link
          href="/settings/preferences"
          className="rounded-sm transition hover:text-[var(--navy-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-50)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy-10)] dark:hover:text-white dark:focus-visible:ring-offset-[#1A1D20]"
        >
          Configurações
        </Link>
      </nav>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs tabular-nums text-[var(--navy-100)]/45 dark:text-white/40">
          {vehicleCount}/{MOCK_VEHICLE_LIMIT} veículos
        </span>
        <Link
          href="/dashboard"
          className="rounded-full border border-[var(--navy-90)]/15 px-3 py-1.5 text-xs font-medium text-[var(--navy-100)]/70 transition hover:border-[var(--navy-90)]/25 hover:text-[var(--navy-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-50)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy-10)] dark:border-white/12 dark:text-white/70 dark:hover:border-white/20 dark:hover:text-white dark:focus-visible:ring-offset-[#1A1D20]"
        >
          ← Dashboard original
        </Link>
      </div>
    </header>
  );
}

export default function DashboardConceptPage(): ReactNode {
  const activeVehicleId = useDashboardStore((state) => state.activeVehicleId);
  const [powerOn, setPowerOn] = useState(true);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const { data: vehicles } = useQuery({
    queryKey: ["dashboard", "vehicle-cards"],
    queryFn: () => apiClient<VehicleCardData[]>("/dashboard/vehicle-cards"),
    retry: false,
  });

  const { data: fleetHealth } = useQuery({
    queryKey: ["dashboard", "fleet-health"],
    queryFn: () => apiClient<FleetHealthEntry[]>("/dashboard/fleet-health"),
    retry: false,
  });

  const { data: alerts } = useQuery({
    queryKey: ["dashboard", "alerts", "include-upcoming"],
    queryFn: () =>
      apiClient<FleetAlertItem[]>("/dashboard/alerts?include_upcoming=true"),
    retry: false,
  });

  const { data: kpiCatalog } = useQuery({
    queryKey: ["dashboard", "kpi-catalog", activeVehicleId],
    queryFn: () =>
      apiClient<FleetKpiCatalog>(
        `/dashboard/kpi-catalog${activeVehicleId ? `?vehicle_id=${activeVehicleId}` : ""}`,
      ),
    retry: false,
  });

  const { data: preferences } = useQuery({
    queryKey: ["preferences"],
    queryFn: () =>
      apiClient<{ dashboard_kpi_ids?: KpiCatalogId[] }>("/preferences"),
    retry: false,
  });
  void preferences; // catálogo consumido diretamente abaixo; ids mantidos apenas para paridade com /dashboard

  const { data: scheduledMaintenances } = useQuery({
    queryKey: ["dashboard-concept", "maintenances-scheduled"],
    queryFn: () =>
      apiClient<Maintenance[]>("/maintenances?status=scheduled&limit=5"),
    retry: false,
  });

  const healthByVehicleId = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of fleetHealth ?? [])
      map.set(entry.vehicle_id, entry.score);
    return map;
  }, [fleetHealth]);

  const activeVehicle =
    vehicles?.find((vehicle) => vehicle.id === activeVehicleId) ??
    vehicles?.[0];
  const activeFlags = activeVehicle
    ? healthByVehicleId.get(activeVehicle.id)
    : undefined;
  void activeFlags;

  const avgHealth = useMemo(() => {
    if (fleetHealth && fleetHealth.length > 0) {
      return (
        fleetHealth.reduce((sum, entry) => sum + entry.score, 0) /
        fleetHealth.length
      );
    }
    const catalogValue = kpiCatalog?.fleet_health;
    return catalogValue?.ok && catalogValue.value !== null
      ? catalogValue.value
      : 0;
  }, [fleetHealth, kpiCatalog]);

  const animatedHealth = useCountUp(avgHealth);
  const animatedVehicleCount = useCountUp(fleetHealth?.length ?? 0);

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const maintenanceEvents: TimelineEvent[] = (
      scheduledMaintenances ?? []
    ).map((maintenance) => {
      const days = daysUntilDate(maintenance.scheduled_date);
      return {
        id: `maintenance:${maintenance.id}`,
        kind: "maintenance",
        label: maintenance.description,
        vehiclePlate:
          vehicles?.find((v) => v.id === maintenance.vehicle_id)?.plate ?? "—",
        date: maintenance.scheduled_date,
        daysUntil: days,
        severity: severityFromDays(days),
      };
    });

    const documentEvents: TimelineEvent[] = (alerts ?? [])
      .filter(
        (alert) =>
          alert.type === "document_overdue" ||
          alert.type === "document_upcoming",
      )
      .map((alert) => ({
        id: alert.id,
        kind: "document",
        label: alert.description,
        vehiclePlate: alert.vehicle_plate,
        date: null,
        daysUntil: alert.days_until_due,
        severity: severityFromDays(alert.days_until_due),
      }));

    return [...maintenanceEvents, ...documentEvents]
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, TIMELINE_MAX_ITEMS);
  }, [scheduledMaintenances, alerts, vehicles]);

  /**
   * Cor de alerta "gritante" (vermelho sólido) reservada só para o que é de fato urgente — item já
   * vencido (`_overdue`, ex: documento atrasado), não lembretes de rotina (`_upcoming`). Misturar os
   * dois no mesmo estilo visual banaliza o sinal.
   */
  const urgentAlerts = useMemo(
    () => (alerts ?? []).filter((alert) => alert.type.endsWith("_overdue")),
    [alerts],
  );

  const expensesMonth = kpiCatalog?.expenses_month.ok
    ? kpiCatalog.expenses_month.value
    : null;
  const costPerKm = kpiCatalog?.cost_per_km.ok
    ? kpiCatalog.cost_per_km.value
    : null;
  const nextMaintenance = kpiCatalog?.next_maintenance.ok
    ? kpiCatalog.next_maintenance.value
    : null;

  return (
    <main
      style={TONE_CSS_VARS}
      className="relative min-h-screen bg-[var(--navy-10)] p-4 text-[var(--navy-100)] dark:bg-[#1A1D20] dark:text-white sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.06] dark:opacity-[0.14]"
        style={{ backgroundImage: `url("${NOISE_TEXTURE}")` }}
      />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-4">
        <NavBar vehicleCount={fleetHealth?.length ?? 0} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
          {/* Painel principal: Próximos eventos (substitui o antigo "Fluxo de Frota") */}
          <section className="relative overflow-hidden rounded-xl border border-[var(--navy-90)]/8 bg-white p-6 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <div className="flex items-start justify-between">
              <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                PRÓXIMOS
                <br />
                EVENTOS
              </h1>
              <Link
                href="/vehicles/new"
                className="flex items-center gap-1 rounded-full bg-[var(--navy-20)] px-4 py-2 text-xs font-semibold text-[var(--navy-100)]/80 transition hover:bg-[var(--navy-90)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-50)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:focus-visible:ring-offset-[var(--graphite-card)]"
              >
                ADICIONAR VEÍCULO +
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
              <div className="flex flex-col justify-between gap-6">
                <div className="flex items-center gap-3 rounded-lg border border-[var(--navy-90)]/8 bg-[var(--navy-20)] p-3 dark:border-white/8 dark:bg-white/5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-[var(--navy-80)] to-[var(--navy-90)] text-white">
                    <Wallet
                      aria-hidden="true"
                      fill="currentColor"
                      fillOpacity={0.25}
                      className="h-5 w-5"
                    />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--navy-100)]/50 dark:text-white/40">
                      Despesas do mês
                    </p>
                    <p className="font-mono text-xl font-bold tabular-nums">
                      {expensesMonth !== null
                        ? currency(expensesMonth.value)
                        : "—"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="font-mono text-3xl font-bold tabular-nums">
                    {Math.round(animatedVehicleCount)}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-[var(--navy-100)]/50 dark:text-white/40">
                    veículos monitorados
                  </p>
                </div>
              </div>

              <div>
                <EventTimeline events={timelineEvents} />
              </div>
            </div>

            {urgentAlerts.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--navy-90)]/8 pt-4 dark:border-white/8">
                {urgentAlerts.slice(0, 3).map((alert) => {
                  // Vermelho fica reservado para o que é de fato crítico (documento vencido — ex:
                  // conta atrasada). Manutenção vencida é rotina do dia a dia do carro, não uma
                  // emergência — tom neutro/navy, amigável mesmo que ainda sinalize atenção.
                  const isCritical = alert.type === "document_overdue";
                  return (
                    <span
                      key={alert.id}
                      className={
                        isCritical
                          ? "rounded-full border border-[#B3261E]/25 bg-[#B3261E]/[0.06] px-3 py-1 text-xs text-[#B3261E]/90 dark:border-[#E2685A]/25 dark:bg-[#E2685A]/[0.08] dark:text-[#E2685A]"
                          : "rounded-full border border-[var(--navy-90)]/15 bg-[var(--navy-90)]/[0.05] px-3 py-1 text-xs text-[var(--navy-100)]/75 dark:border-white/12 dark:bg-white/8 dark:text-white/70"
                      }
                    >
                      {alert.vehicle_plate} · {alert.description}
                    </span>
                  );
                })}
              </div>
            )}
          </section>

          {/* Spotlight do veículo ativo */}
          <section className="flex flex-col overflow-hidden rounded-xl border border-[var(--navy-90)]/8 bg-white dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <div className="relative flex flex-col items-center gap-3 bg-gradient-to-b from-[var(--navy-20)] to-transparent px-6 pb-6 pt-6 dark:from-white/5">
              <div className="flex w-full items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">
                  {activeVehicle
                    ? vehicleLabel(activeVehicle).toUpperCase()
                    : "SEM VEÍCULO"}
                </h2>
                {activeVehicle && (
                  <span className="flex min-w-[92px] flex-col overflow-hidden rounded-md border border-black/15 bg-white shadow-sm">
                    <span className="bg-[var(--navy-60)] py-[1px] text-center text-[7px] font-bold uppercase tracking-[0.25em] text-white">
                      Brasil
                    </span>
                    <span className="px-2 py-0.5 text-center font-mono text-xs font-bold uppercase tracking-wider tabular-nums text-black">
                      {activeVehicle.plate}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex h-36 w-full items-center justify-center rounded-lg border border-[var(--navy-90)]/8 bg-[var(--navy-20)] dark:border-white/8 dark:bg-black/30">
                <Car
                  aria-hidden="true"
                  className="h-16 w-16 text-[var(--navy-100)]/30 dark:text-white/30"
                />
              </div>

              <div className="flex w-full items-center justify-between pt-1">
                <span className="text-xs uppercase tracking-wide text-[var(--navy-100)]/50 dark:text-white/40">
                  Status
                </span>
                <button
                  type="button"
                  onClick={() => setPowerOn((prev) => !prev)}
                  aria-pressed={powerOn}
                  aria-label={powerOn ? "Desativar veículo" : "Ativar veículo"}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-50)] focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[var(--graphite-card)] ${
                    powerOn
                      ? "bg-[var(--gold-50)] text-white"
                      : "bg-[var(--navy-90)]/10 text-[var(--navy-100)]/40 dark:bg-white/10 dark:text-white/40"
                  }`}
                >
                  <Power aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 border-t border-[var(--navy-90)]/8 px-6 py-6 dark:border-white/8">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--navy-100)]/50 dark:text-white/40">
                Saúde da frota
              </p>
              <SemiGauge value={animatedHealth} label="saúde" isDark={isDark} />
              <div className="mt-1 flex w-full justify-between font-mono text-xs tabular-nums text-[var(--navy-100)]/50 dark:text-white/40">
                <span>
                  Custo/km {costPerKm ? currency(costPerKm.value) : "—"}
                </span>
                <span>{fleetHealth?.length ?? 0} veículos</span>
              </div>
            </div>

            {vehicles && vehicles.length > 0 && (
              <div className="border-t border-[var(--navy-90)]/8 px-6 py-5 dark:border-white/8">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--navy-100)]/50 dark:text-white/40">
                  Comparar veículos
                </p>
                <MultiSelectDemo vehicles={vehicles} />
              </div>
            )}
          </section>
        </div>

        {/* Linha inferior de detalhes */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--navy-100)]/70 dark:text-white/70">
              Detalhes
            </h3>
            <dl className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <dt className="text-xs text-[var(--navy-100)]/50 dark:text-white/40">
                  Odômetro
                </dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {activeVehicle?.odometer !== null &&
                  activeVehicle?.odometer !== undefined
                    ? `${activeVehicle.odometer.toLocaleString("pt-BR")} km`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--navy-100)]/50 dark:text-white/40">
                  Último abastec.
                </dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {activeVehicle?.last_fuel_date
                    ? formatDate(activeVehicle.last_fuel_date)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--navy-100)]/50 dark:text-white/40">
                  IPVA
                </dt>
                <dd className="font-semibold capitalize">
                  {activeVehicle?.documents.ipva ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--navy-100)]/50 dark:text-white/40">
                  Seguro
                </dt>
                <dd className="font-semibold capitalize">
                  {activeVehicle?.documents.insurance ?? "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--navy-100)]/70 dark:text-white/70">
              Próxima manutenção
            </h3>
            {nextMaintenance ? (
              <div className="flex flex-col gap-2">
                <p className="font-mono text-3xl font-bold tabular-nums">
                  {formatDate(nextMaintenance.date)}
                </p>
                <p className="font-mono text-xs tabular-nums text-[var(--navy-100)]/50 dark:text-white/40">
                  Veículo {nextMaintenance.vehicle_plate}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--navy-100)]/50 dark:text-white/40">
                Nenhuma manutenção agendada.
              </p>
            )}
            <Link
              href="/maintenance"
              className="mt-4 inline-flex items-center gap-1 rounded-full bg-[var(--gold-50)] px-3 py-1.5 text-xs font-semibold text-[var(--navy-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-50)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[var(--graphite-card)]"
            >
              Ver manutenções →
            </Link>
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--navy-100)]/70 dark:text-white/70">
              Custo por km
            </h3>
            <div className="flex items-center justify-center rounded-lg border border-[var(--navy-90)]/8 bg-[var(--navy-20)] py-6 dark:border-white/8 dark:bg-black/40">
              <span className="font-mono text-4xl font-bold tracking-tight tabular-nums text-[var(--navy-100)] dark:text-white">
                {costPerKm ? currency(costPerKm.value) : "—"}
              </span>
            </div>
            <div className="mt-3 flex justify-between font-mono text-xs tabular-nums text-[var(--navy-100)]/50 dark:text-white/40">
              <span>Mês atual</span>
              <span>
                {costPerKm?.delta_pct !== null &&
                costPerKm?.delta_pct !== undefined
                  ? `${costPerKm.delta_pct > 0 ? "+" : ""}${costPerKm.delta_pct}%`
                  : "—"}
              </span>
            </div>
          </section>
        </div>

        {/* Galeria de padrões de UI — formulário, overlay, skeleton, animação, profundidade, tooltip */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--navy-100)]/70 dark:text-white/70">
              Formulário
            </h3>
            <FormExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--navy-100)]/70 dark:text-white/70">
              Overlay
            </h3>
            <OverlayExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--navy-100)]/70 dark:text-white/70">
              Skeleton
            </h3>
            <SkeletonExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--navy-100)]/70 dark:text-white/70">
              Animação
            </h3>
            <AnimationExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--navy-100)]/70 dark:text-white/70">
              Profundidade
            </h3>
            <DepthExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--navy-100)]/70 dark:text-white/70">
              Balão informativo
            </h3>
            <TooltipExample />
          </section>
        </div>

        {/* Galeria de padrões (v11) — navegação e estrutura */}
        <h2 className="mt-2 text-xs font-bold uppercase tracking-widest text-[var(--navy-100)]/45 dark:text-white/40">
          navegação e estrutura
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Breadcrumb</h3>
            <BreadcrumbExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Tabs</h3>
            <TabsExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Paginação</h3>
            <PaginationExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Menu de contexto</h3>
            <ContextMenuExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Accordion</h3>
            <AccordionExample />
          </section>
        </div>

        {/* Galeria de padrões (v11) — feedback e status */}
        <h2 className="mt-2 text-xs font-bold uppercase tracking-widest text-[var(--navy-100)]/45 dark:text-white/40">
          Feedback e status
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Toast</h3>
            <ToastExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Banner persistente</h3>
            <PersistentBannerExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Badge de contagem</h3>
            <BadgeCountExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Progresso determinado</h3>
            <DeterminateProgressExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Estado vazio</h3>
            <EmptyStateExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Estado de erro</h3>
            <ErrorStateExample />
          </section>
        </div>

        {/* Galeria de padrões (v11) — entrada de dados */}
        <h2 className="mt-2 text-xs font-bold uppercase tracking-widest text-[var(--navy-100)]/45 dark:text-white/40">
          Entrada de dados
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Select</h3>
            <SelectExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Checkbox e radio</h3>
            <CheckboxRadioExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Textarea</h3>
            <TextareaExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Date picker</h3>
            <DatePickerExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Upload de arquivo</h3>
            <FileUploadExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Busca com autocomplete</h3>
            <AutocompleteExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Stepper</h3>
            <StepperExample />
          </section>
        </div>

        {/* Galeria de padrões (v11) — exibição de dados */}
        <h2 className="mt-2 text-xs font-bold uppercase tracking-widest text-[var(--navy-100)]/45 dark:text-white/40">
          Exibição de dados
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>
              Tabela com ordenação/filtro
            </h3>
            <SortableTableExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>
              Card de estatística compacto
            </h3>
            <KpiTileCompactExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Timeline vertical</h3>
            <VerticalTimelineExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Avatar</h3>
            <AvatarExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Chip removível</h3>
            <RemovableChipExample />
          </section>
        </div>

        {/* Galeria de padrões (v11) — interação */}
        <h2 className="mt-2 text-xs font-bold uppercase tracking-widest text-[var(--navy-100)]/45 dark:text-white/40">
          Interação
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Dropdown menu</h3>
            <DropdownMenuExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Popover</h3>
            <PopoverExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Confirmação inline</h3>
            <InlineConfirmExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>
              Drag and drop para reordenar
            </h3>
            <DragReorderExample />
          </section>

          <section className="rounded-xl border border-[var(--navy-90)]/8 bg-white p-5 dark:border-white/8 dark:bg-[var(--graphite-card)]">
            <h3 className={PATTERN_SECTION_TITLE}>Context switcher</h3>
            <ContextSwitcherExample vehicles={vehicles ?? []} />
          </section>
        </div>
      </div>
    </main>
  );
}
