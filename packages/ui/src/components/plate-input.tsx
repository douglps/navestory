"use client";

import { type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { inputBaseClass } from "./input";

export const PLATE_MAX_CHARS = 7;

/**
 * @spec SPEC-20260807-003 RF-03
 * Padrão do caractere em cada posição (0-indexed) da placa crua (sem hífen):
 * 0-2 letra, 3 dígito, 4 letra ou dígito (decide BR vs. Mercosul), 5-6 dígito —
 * espelha `LICENSE_PLATE_REGEX` de `@navestory/validators`.
 */
function isAllowedAt(position: number, key: string): boolean {
  if (position < 3) return /^[A-Za-z]$/.test(key);
  if (position === 3) return /^[0-9]$/.test(key);
  if (position === 4) return /^[A-Za-z0-9]$/.test(key);
  return /^[0-9]$/.test(key);
}

/**
 * @spec SPEC-20260807-003 RF-03
 * Formata o valor cru (sem hífen, uppercase) para exibição: insere hífen visual após o 3º
 * caractere enquanto o formato ainda não foi decidido pelo 5º caractere (BR) e remove o
 * hífen assim que o 5º caractere é uma letra (Mercosul) — a máscara é só visual, o valor
 * enviado ao backend nunca tem hífen.
 */
export function formatPlateDisplay(raw: string): string {
  if (raw.length <= 3) return raw;
  const fifthChar = raw[4];
  const isMercosul = fifthChar !== undefined && /^[A-Za-z]$/.test(fifthChar);
  if (isMercosul) return raw;
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

function applyPlateKeystroke(raw: string, key: string): string | null {
  if (key === "Backspace") {
    return raw.slice(0, -1);
  }
  if (raw.length >= PLATE_MAX_CHARS) return null;
  if (!isAllowedAt(raw.length, key)) return null;
  return raw + key.toUpperCase();
}

export interface PlateInputProps {
  id?: string;
  value: string;
  onChange: (rawValue: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  placeholder?: string;
  className?: string;
}

/**
 * @spec SPEC-20260807-003 RF-03, RF-04, RNF-05
 * Input controlado de placa com máscara progressiva BR/Mercosul (mesmo padrão acumulador
 * de `CurrencyInput`/`OdometerInput`, sem depender de lib externa de máscara). `value` e
 * `onChange` trafegam sempre o valor cru (sem hífen, uppercase) — a formatação com hífen é
 * puramente visual, aplicada em `formatPlateDisplay`.
 */
export function PlateInput({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  required,
  placeholder,
  className,
  ...rest
}: PlateInputProps): ReactNode {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    const next = applyPlateKeystroke(value, event.key);
    if (next === null) {
      if (event.key.length === 1) event.preventDefault();
      return;
    }
    event.preventDefault();
    onChange(next);
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="text"
      autoCapitalize="characters"
      value={formatPlateDisplay(value)}
      readOnly
      onKeyDown={handleKeyDown}
      onBlur={onBlur}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      className={cn(inputBaseClass, "h-10 uppercase", className)}
      {...rest}
    />
  );
}
