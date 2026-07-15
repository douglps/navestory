"use client";

import { type KeyboardEvent, type ReactNode } from "react";

/**
 * @spec SPEC-20260612-001 RF-03
 * Máscara "caixa eletrônico": o estado é um acumulador de dígitos puros — cada dígito
 * digitado entra pela direita, empurrando os já presentes para a esquerda. Os helpers
 * abaixo são puros (sem estado) para permitir uso direto em componentes controlados
 * (`value`/`onChange`) sem depender de react-hook-form.
 */
export const CURRENCY_MAX_DIGITS = 11;
export const ODOMETER_MAX_DIGITS = 7;

function formatThousands(integerPart: string): string {
  const groups: string[] = [];
  for (let end = integerPart.length; end > 0; end -= 3) {
    groups.unshift(integerPart.slice(Math.max(0, end - 3), end));
  }
  return groups.join(".");
}

/** @spec SPEC-20260612-001 RF-03 — digits são o valor em centavos, sempre >= "0" na exibição. */
export function digitsToCurrencyDisplay(digits: string): string {
  const padded = digits.padStart(3, "0");
  const cents = padded.slice(-2);
  const integerPart = padded.slice(0, -2).replace(/^0+(?=\d)/, "");
  return `${formatThousands(integerPart)},${cents}`;
}

/** @spec SPEC-20260612-001 RF-03 — digits são o valor inteiro (km), sem casas decimais. */
export function digitsToOdometerDisplay(digits: string): string {
  if (digits === "") return "";
  const normalized = digits.replace(/^0+(?=\d)/, "");
  return formatThousands(normalized);
}

export function currencyDigitsToValue(digits: string): number | undefined {
  if (digits === "") return undefined;
  return Number(digits) / 100;
}

export function valueToCurrencyDigits(value: number | undefined | null): string {
  if (value == null) return "";
  return String(Math.round(value * 100));
}

export function odometerDigitsToValue(digits: string): number | undefined {
  if (digits === "") return undefined;
  return Number(digits);
}

export function valueToOdometerDigits(value: number | undefined | null): string {
  if (value == null) return "";
  return String(Math.round(value));
}

function applyKeystroke(currentDigits: string, key: string, maxDigits: number): string | null {
  if (key === "Backspace") {
    return currentDigits.slice(0, -1);
  }
  if (/^[0-9]$/.test(key)) {
    return (currentDigits + key).slice(-maxDigits);
  }
  return null;
}

interface MaskedNumberInputProps {
  id?: string;
  value: number | undefined | null;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
  placeholder?: string;
}

/**
 * @spec SPEC-20260612-001 RF-03.1, RF-03.3
 * @spec SPEC-20260612-002 RF-01.2
 */
export function CurrencyInput({
  id,
  value,
  onChange,
  disabled,
  required,
  prefix = "R$",
  ...rest
}: MaskedNumberInputProps & { prefix?: string | null }): ReactNode {
  const digits = valueToCurrencyDigits(value);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    const next = applyKeystroke(digits, event.key, CURRENCY_MAX_DIGITS);
    if (next === null) {
      if (event.key.length === 1) event.preventDefault();
      return;
    }
    event.preventDefault();
    onChange(currencyDigitsToValue(next));
  }

  return (
    <span className="inline-flex items-center gap-1">
      {prefix && <span aria-hidden>{prefix}</span>}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={digits === "" ? "" : digitsToCurrencyDisplay(digits)}
        readOnly
        onKeyDown={handleKeyDown}
        disabled={disabled}
        required={required}
        {...rest}
      />
    </span>
  );
}

/**
 * @spec SPEC-20260612-001 RF-03.2
 * @spec SPEC-20260612-002 RF-04.1
 */
export function OdometerInput({
  id,
  value,
  onChange,
  disabled,
  required,
  ...rest
}: MaskedNumberInputProps): ReactNode {
  const digits = valueToOdometerDigits(value);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    const next = applyKeystroke(digits, event.key, ODOMETER_MAX_DIGITS);
    if (next === null) {
      if (event.key.length === 1) event.preventDefault();
      return;
    }
    event.preventDefault();
    onChange(odometerDigitsToValue(next));
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={digitsToOdometerDisplay(digits)}
      readOnly
      onKeyDown={handleKeyDown}
      disabled={disabled}
      required={required}
      {...rest}
    />
  );
}
