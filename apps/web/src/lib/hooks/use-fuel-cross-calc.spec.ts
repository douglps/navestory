import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFuelCrossCalc } from "./use-fuel-cross-calc";

/**
 * @spec SPEC-20260612-001 RF-05.2
 */
describe("useFuelCrossCalc", () => {
  it("formulário do zero: editar liters recalcula amount usando price_per_liter existente", () => {
    const { result } = renderHook(() => useFuelCrossCalc());

    act(() => result.current.setPricePerLiter(5));
    act(() => result.current.setLiters(10));

    expect(result.current.amount).toBe(50);
    expect(result.current.liters).toBe(10);
  });

  it("formulário do zero: editar amount recalcula price_per_liter (pareamento padrão)", () => {
    const { result } = renderHook(() => useFuelCrossCalc({ liters: 10 }));

    act(() => result.current.setAmount(50));

    expect(result.current.pricePerLiter).toBe(5);
  });

  it("editar amount recalcula liters quando price_per_liter já presente e liters ausente", () => {
    const { result } = renderHook(() => useFuelCrossCalc({ price_per_liter: 5 }));

    act(() => result.current.setAmount(50));

    expect(result.current.liters).toBe(10);
  });

  it("só um dos outros dois foi editado manualmente: recalcula o que NÃO foi", () => {
    const { result } = renderHook(() => useFuelCrossCalc());

    act(() => result.current.setLiters(10)); // liters manual → recalcula amount (nenhum editado ainda)
    act(() => result.current.setPricePerLiter(5)); // price manual → liters já não é o único editado

    // liters e price ambos manuais agora; amount é o único não-manual, deve refletir liters*price
    expect(result.current.amount).toBe(50);
  });

  it("ambos os outros dois editados manualmente: recalcula o editado há mais tempo, preserva o mais recente", () => {
    const { result } = renderHook(() => useFuelCrossCalc());

    act(() => result.current.setLiters(10)); // liters manual, target=amount (legado)
    act(() => result.current.setPricePerLiter(5)); // price manual, target=liters? -> aIn(amount)=false,bIn? both others (amount,liters); amount not in stack, liters in stack -> target=amount
    // estado: liters=10 manual, price=5 manual, amount=50 calculado
    act(() => result.current.setAmount(100)); // amount manual agora; outros: liters(manual) e price(manual) -> ambos in stack -> recalcula o mais antigo (liters, editado antes de price)

    expect(result.current.liters).toBe(20); // 100 / 5
    expect(result.current.pricePerLiter).toBe(5); // preservado (mais recente entre os dois antes desta edição)
    expect(result.current.amount).toBe(100); // preservado (acabou de ser editado)
  });

  it("reset limpa valores e a pilha de edição", () => {
    const { result } = renderHook(() => useFuelCrossCalc());

    act(() => result.current.setLiters(10));
    act(() => result.current.reset());

    expect(result.current.amount).toBeUndefined();
    expect(result.current.liters).toBeUndefined();
    expect(result.current.pricePerLiter).toBeUndefined();
  });

  it("não recalcula quando faltam dados suficientes (ex: liters sem price)", () => {
    const { result } = renderHook(() => useFuelCrossCalc());

    act(() => result.current.setLiters(10));

    expect(result.current.amount).toBeUndefined();
  });
});
