"use client";

import { useState } from "react";

type FuelField = "amount" | "liters" | "price_per_liter";

const ALL_FIELDS: FuelField[] = ["amount", "liters", "price_per_liter"];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeTarget(
  target: FuelField,
  amount: number | undefined,
  liters: number | undefined,
  pricePerLiter: number | undefined,
): number | undefined {
  if (target === "amount") {
    if (liters != null && liters > 0 && pricePerLiter != null) return round2(liters * pricePerLiter);
    return undefined;
  }
  if (target === "price_per_liter") {
    if (amount != null && liters != null && liters > 0) return round2(amount / liters);
    return undefined;
  }
  if (amount != null && pricePerLiter != null && pricePerLiter > 0) return round2(amount / pricePerLiter);
  return undefined;
}

/**
 * @spec SPEC-20260612-001 RF-05.2
 * @spec SPEC-20260619-001 R-FUEL-08
 * Pilha `fuelEditOrder`: ordem de edição manual dos 3 campos, do mais recente para o mais
 * antigo. Só entram campos digitados diretamente pelo usuário; o campo recalculado a cada
 * edição sai da pilha (volta a ser "apenas calculado").
 */
export function useFuelCrossCalc(initial?: {
  amount?: number;
  liters?: number;
  price_per_liter?: number;
}) {
  const [amount, setAmountRaw] = useState<number | undefined>(initial?.amount);
  const [liters, setLitersRaw] = useState<number | undefined>(initial?.liters);
  const [pricePerLiter, setPricePerLiterRaw] = useState<number | undefined>(initial?.price_per_liter);
  const [editOrder, setEditOrder] = useState<FuelField[]>([]);

  function legacyTarget(field: FuelField): FuelField {
    if (field !== "amount") return "amount";
    if (pricePerLiter != null && liters == null) return "liters";
    return "price_per_liter";
  }

  function edit(field: FuelField, value: number | undefined): void {
    const [otherA, otherB] = ALL_FIELDS.filter((f) => f !== field) as [FuelField, FuelField];
    const aIn = editOrder.includes(otherA);
    const bIn = editOrder.includes(otherB);

    let target: FuelField;
    if (!aIn && !bIn) {
      target = legacyTarget(field);
    } else if (aIn !== bIn) {
      target = aIn ? otherB : otherA;
    } else {
      // ambos editados manualmente: recalcula o editado há mais tempo (mais embaixo na pilha)
      target = editOrder.indexOf(otherA) > editOrder.indexOf(otherB) ? otherA : otherB;
    }

    const values = { amount, liters, price_per_liter: pricePerLiter, [field]: value };
    const targetValue = computeTarget(target, values.amount, values.liters, values.price_per_liter);

    if (field === "amount") setAmountRaw(value);
    else if (field === "liters") setLitersRaw(value);
    else setPricePerLiterRaw(value);

    if (target === "amount") setAmountRaw(targetValue);
    else if (target === "liters") setLitersRaw(targetValue);
    else setPricePerLiterRaw(targetValue);

    setEditOrder([field, ...editOrder.filter((f) => f !== field && f !== target)]);
  }

  function reset(next?: { amount?: number; liters?: number; price_per_liter?: number }): void {
    setAmountRaw(next?.amount);
    setLitersRaw(next?.liters);
    setPricePerLiterRaw(next?.price_per_liter);
    setEditOrder([]);
  }

  return {
    amount,
    liters,
    pricePerLiter,
    setAmount: (value: number | undefined) => edit("amount", value),
    setLiters: (value: number | undefined) => edit("liters", value),
    setPricePerLiter: (value: number | undefined) => edit("price_per_liter", value),
    reset,
  };
}
