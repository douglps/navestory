"use client";

import { type ReactNode, useId } from "react";
import { cn } from "../lib/cn";

/**
 * DatePicker de data única.
 * Usa o mesmo padrão de input nativo do DateRangePicker — sem dependência de
 * react-day-picker, compatível com todos os browsers e acessível por padrão.
 *
 * Limitação conhecida: iOS Safari renderiza o input de data com spin-wheels nativos
 * (não um campo de texto). Comportamento idêntico ao DateRangePicker existente.
 */
export interface DatePickerProps {
  value?: Date;
  onValueChange: (date: Date | undefined) => void;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  error?: string;
  /** Label exibido acima do input. */
  label?: string;
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

export function DatePicker({
  value,
  onValueChange,
  disabled = false,
  minDate,
  maxDate,
  error,
  label,
  className,
}: DatePickerProps): ReactNode {
  const inputId = useId();
  const errorId = useId();

  const inputClass = cn(
    "h-11 w-full rounded-md border bg-background px-3 text-sm",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    error ? "border-danger" : "border-border",
  );

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label htmlFor={inputId} className="block text-xs text-muted-foreground">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="date"
        disabled={disabled}
        value={toInputValue(value)}
        min={toInputValue(minDate)}
        max={toInputValue(maxDate)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          onValueChange(fromInputValue(event.target.value));
        }}
        className={inputClass}
      />
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
