import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUIStore } from "@/lib/stores/ui-store";
import { ContextStaleToast } from "./context-stale-toast";

describe("ContextStaleToast", () => {
  beforeEach(() => {
    useUIStore.getState().clearContextStaleNotice();
  });

  it("não renderiza nada sem aviso ativo", () => {
    render(<ContextStaleToast />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("RNF-04: exibe o aviso e permite fechar manualmente", () => {
    act(() => useUIStore.getState().setContextStaleNotice("Contexto limpo"));
    render(<ContextStaleToast />);

    expect(screen.getByRole("status")).toHaveTextContent("Contexto limpo");

    fireEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));
    expect(useUIStore.getState().contextStaleNotice).toBeNull();
  });

  it("RNF-04: some sozinho após 5 segundos", () => {
    vi.useFakeTimers();
    try {
      act(() => useUIStore.getState().setContextStaleNotice("Contexto limpo"));
      render(<ContextStaleToast />);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(useUIStore.getState().contextStaleNotice).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
