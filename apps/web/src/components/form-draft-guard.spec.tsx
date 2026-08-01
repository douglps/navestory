import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useFormDraft } from "./form-draft-guard";

describe("useFormDraft", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("inicia sem rascunho quando sessionStorage está vazio", () => {
    const { result } = renderHook(() => useFormDraft("/expenses/new"));
    expect(result.current.draft).toBeNull();
  });

  it("salva o rascunho em sessionStorage sob a chave navestory_form_draft_[route]", () => {
    const { result } = renderHook(() =>
      useFormDraft<{ amount: number }>("/expenses/new"),
    );

    act(() => {
      result.current.saveDraft({ amount: 100 });
    });

    expect(result.current.draft).toEqual({ amount: 100 });
    expect(sessionStorage.getItem("navestory_form_draft_/expenses/new")).toBe(
      JSON.stringify({ amount: 100 }),
    );
  });

  it("restaura o rascunho já salvo ao montar (STORY-07b)", () => {
    sessionStorage.setItem(
      "navestory_form_draft_/vehicles/new",
      JSON.stringify({ plate: "ABC1234" }),
    );

    const { result } = renderHook(() => useFormDraft("/vehicles/new"));

    expect(result.current.draft).toEqual({ plate: "ABC1234" });
  });

  it("clearDraft remove o rascunho do sessionStorage", () => {
    const { result } = renderHook(() =>
      useFormDraft<{ amount: number }>("/expenses/new"),
    );

    act(() => {
      result.current.saveDraft({ amount: 50 });
    });
    act(() => {
      result.current.clearDraft();
    });

    expect(result.current.draft).toBeNull();
    expect(
      sessionStorage.getItem("navestory_form_draft_/expenses/new"),
    ).toBeNull();
  });
});
