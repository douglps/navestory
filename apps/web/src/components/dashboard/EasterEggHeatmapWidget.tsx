"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SeasonalHeatmapCell } from "@navestory/validators";
import { apiClient } from "@/lib/http/api-client";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { CHART_CATEGORY_COLORS } from "@/lib/chart-colors";
import {
  EASTER_EGG_SEEN_KEY,
  computeCategoryCooccurrence,
  isUnlocked,
  isWithinFirstWeek,
  topCategories,
} from "@/lib/analytics/easter-egg-heatmap";

const GRID_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const TRANSITION_MS = 550;

function readSeen(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(EASTER_EGG_SEEN_KEY) === "true";
}

function markSeen(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EASTER_EGG_SEEN_KEY, "true");
}

/**
 * @spec SPEC-20260801-001 RF-04
 * Diagrama de coocorrência: nós = categorias em círculo, arcos = frequência de coocorrência
 * mensal. SVG manual — o formato não é coberto pelos gráficos padrão de recharts.
 */
function CooccurrenceDiagram({
  cells,
}: {
  cells: SeasonalHeatmapCell[];
}): ReactNode {
  const categories = topCategories(cells, 5);
  const cooccurrence = computeCategoryCooccurrence(cells);
  const maxCount = Math.max(1, ...cooccurrence.map((entry) => entry.monthCount));

  const size = 220;
  const radius = 80;
  const center = size / 2;
  const positions = new Map<string, { x: number; y: number }>();
  categories.forEach((category, index) => {
    const angle = (2 * Math.PI * index) / categories.length - Math.PI / 2;
    positions.set(category, {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    });
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label="Diagrama de categorias relacionadas"
      className="mx-auto"
    >
      {cooccurrence
        .filter(
          (entry) =>
            positions.has(entry.categoryA) && positions.has(entry.categoryB),
        )
        .map((entry) => {
          const from = positions.get(entry.categoryA);
          const to = positions.get(entry.categoryB);
          if (!from || !to) return null;
          const strength = entry.monthCount / maxCount;
          return (
            <line
              key={`${entry.categoryA}-${entry.categoryB}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="currentColor"
              strokeOpacity={0.2 + strength * 0.6}
              strokeWidth={1 + strength * 4}
            />
          );
        })}
      {categories.map((category, index) => {
        const position = positions.get(category);
        if (!position) return null;
        return (
          <circle
            key={category}
            cx={position.x}
            cy={position.y}
            r={8}
            fill={CHART_CATEGORY_COLORS[index % CHART_CATEGORY_COLORS.length]}
          />
        );
      })}
    </svg>
  );
}

/**
 * @spec SPEC-20260801-001
 * Widget discreto no `FleetChartsSection` — permanece latente até ≥40% de presença mensal
 * (R-ANA-08), momento em que revela o diagrama de coocorrência de categorias. Mecânica de
 * descoberta orgânica: sem título, sem tooltip, sem indicador de critério de desbloqueio.
 */
export function EasterEggHeatmapWidget(): ReactNode {
  const { data: cells } = useQuery({
    queryKey: ["analytics", "seasonal", ""],
    queryFn: () => apiClient<SeasonalHeatmapCell[]>("/analytics/seasonal"),
    retry: false,
  });
  const { data: currentUser } = useCurrentUser();
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );

  const [seen, setSeen] = useState(true);
  const [showDiagram, setShowDiagram] = useState(false);

  useEffect(() => {
    setSeen(readSeen());
  }, []);

  if (!cells || cells.length === 0) return null;

  const unlocked = isUnlocked(cells);
  const categories = topCategories(cells, 5);
  const cellByKey = new Map(
    cells.map((cell) => [`${cell.month_number}-${cell.category}`, cell]),
  );

  const showDot =
    !unlocked &&
    !seen &&
    Boolean(currentUser?.created_at) &&
    isWithinFirstWeek(currentUser?.created_at ?? "", new Date());

  function handleReveal() {
    if (!seen) {
      markSeen();
      setSeen(true);
    }
  }

  const transitionClass = prefersReducedMotion
    ? ""
    : "transition-all ease-out";
  const transitionStyle = prefersReducedMotion
    ? undefined
    : { transitionDuration: `${TRANSITION_MS}ms` };

  return (
    <div
      className="relative w-16 h-8"
      onMouseEnter={handleReveal}
      onTouchStart={handleReveal}
    >
      {showDot && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-primary opacity-60 animate-pulse"
        />
      )}

      <button
        type="button"
        aria-label="Visualização de padrões de gasto"
        onClick={() => unlocked && setShowDiagram((prev) => !prev)}
        className={`grid grid-cols-12 grid-rows-5 gap-px w-16 h-8 ${transitionClass} ${
          unlocked ? "cursor-pointer" : "cursor-default"
        }`}
        style={{ opacity: unlocked ? 1 : 0.28, ...transitionStyle }}
        disabled={!unlocked}
      >
        {GRID_MONTHS.flatMap((month) =>
          categories.map((category) => {
            const cell = cellByKey.get(`${month}-${category}`);
            const colorIndex = categories.indexOf(category);
            return (
              <span
                key={`${month}-${category}`}
                style={{
                  backgroundColor: cell
                    ? CHART_CATEGORY_COLORS[
                        colorIndex % CHART_CATEGORY_COLORS.length
                      ]
                    : "transparent",
                }}
              />
            );
          }),
        )}
      </button>

      {unlocked && showDiagram && (
        <div
          className="absolute right-0 top-full z-10 mt-2 rounded border bg-popover p-3 shadow-lg"
        >
          <CooccurrenceDiagram cells={cells} />
        </div>
      )}
    </div>
  );
}
