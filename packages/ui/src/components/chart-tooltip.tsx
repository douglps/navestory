import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface ChartTooltipPayloadItem {
  name?: string | number;
  value?: number | string | readonly (number | string)[];
  color?: string;
  dataKey?: string | number | ((obj: unknown) => unknown);
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly ChartTooltipPayloadItem[];
  label?: string | number;
  formatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string) => string;
  className?: string;
}

/**
 * @spec SPEC-20260813-001
 * Substitui o tooltip default do Recharts (fundo/texto fixos via inline style, sem contraste
 * garantido em dark mode) por um componente que segue os tokens do design system. Usar via
 * `<Tooltip content={(props) => <ChartTooltip {...props} />} />` — nunca `contentStyle`, que
 * perde a disputa de especificidade contra os inline styles que o Recharts já aplica.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  className,
}: ChartTooltipProps): ReactNode {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "max-w-[180px] break-words rounded-md border border-border bg-card px-3 py-2 text-xs text-card-foreground shadow-md",
        className,
      )}
    >
      {label !== undefined && label !== "" && (
        <p className="mb-1 font-medium text-muted-foreground">
          {labelFormatter ? labelFormatter(String(label)) : label}
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {payload.map((item, index) => {
          const dataKey =
            typeof item.dataKey === "string" || typeof item.dataKey === "number"
              ? item.dataKey
              : "";
          const name = String(item.name ?? dataKey);
          const rawValue = Array.isArray(item.value) ? item.value[0] : item.value;
          const value = Number(rawValue ?? 0);
          return (
            <li key={`${name}-${index}`} className="flex items-center gap-1.5">
              {item.color && (
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="font-medium text-card-foreground">
                {formatter ? formatter(value, name) : `${name}: ${value}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
