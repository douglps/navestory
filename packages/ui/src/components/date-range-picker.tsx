"use client";

import { type ReactNode, useId } from "react";
import { cn } from "../lib/cn";

/**
 * @spec SPEC-20260525-001 §7.3
 * Dois `<input type="date">` nativos (sem lib de calendário nova) — o visual da spec
 * mostra exatamente esse padrão ("dois inputs empilhados" no mobile, lado a lado no
 * desktop), coerente com a decisão v0.2 de não introduzir dependência de calendário.
 */
export interface DateRange {
  from: Date;
  to?: Date;
}

export interface DateRangePreset {
  label: string;
  range: { from: Date; to: Date };
}

export interface DateRangePickerProps {
  value?: DateRange;
  onValueChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  presets?: DateRangePreset[];
  error?: string;
  className?: string;
}

function toInputValue(date: Date | undefined): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromInputValue(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

/** @spec SPEC-20260525-001 §7.3 */
export function DateRangePicker({
  value,
  onValueChange,
  disabled = false,
  minDate,
  maxDate,
  presets = [],
  error,
  className,
}: DateRangePickerProps): ReactNode {
  const fromId = useId();
  const toId = useId();
  const errorId = useId();

  const inputClass = cn(
    "h-11 w-full rounded-md border bg-background px-3 text-sm",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    error ? "border-danger" : "border-border",
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {presets.length > 0 && (
        <div role="group" aria-label="Períodos predefinidos" className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={disabled}
              onClick={() => onValueChange(preset.range)}
              className={cn(
                "h-8 shrink-0 rounded-full border border-border px-3 text-xs text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <label htmlFor={fromId} className="mb-1 block text-xs text-muted-foreground">
            Data inicial
          </label>
          <input
            id={fromId}
            type="date"
            disabled={disabled}
            value={toInputValue(value?.from)}
            min={toInputValue(minDate)}
            max={toInputValue(maxDate)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              const from = fromInputValue(event.target.value);
              if (!from) {
                onValueChange(undefined);
                return;
              }
              onValueChange({ from, to: value?.to });
            }}
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label htmlFor={toId} className="mb-1 block text-xs text-muted-foreground">
            Data final
          </label>
          <input
            id={toId}
            type="date"
            disabled={disabled}
            value={toInputValue(value?.to)}
            min={toInputValue(value?.from ?? minDate)}
            max={toInputValue(maxDate)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              const to = fromInputValue(event.target.value);
              if (!value?.from) return;
              onValueChange({ from: value.from, to });
            }}
            className={inputClass}
          />
        </div>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
