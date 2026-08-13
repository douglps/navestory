import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VehicleContextDialog } from "./vehicle-context-dialog";

vi.mock("./vehicle-switcher-content", () => ({
  VehicleSwitcherContent: ({ onClose }: { onClose: () => void }) => (
    <button type="button" onClick={onClose}>
      fechar conteúdo
    </button>
  ),
}));

function renderDialog(open: boolean, onOpenChange: (open: boolean) => void): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    (
      <QueryClientProvider client={queryClient}>
        <VehicleContextDialog open={open} onOpenChange={onOpenChange} />
      </QueryClientProvider>
    ) as ReactNode,
  );
}

describe("VehicleContextDialog", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: [] }),
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("não renderiza o dialog quando open é false", () => {
    renderDialog(false, vi.fn());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza o conteúdo e repassa onClose do VehicleSwitcherContent para onOpenChange(false)", () => {
    const onOpenChange = vi.fn();
    renderDialog(true, onOpenChange);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "fechar conteúdo" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // @spec SPEC-20260603-001 RF-08 — Esc não deve propagar para o handler global do sidebar
  it("RF-08: Escape fecha o dialog sem propagar para o document", () => {
    const onOpenChange = vi.fn();
    const documentKeydown = vi.fn();
    document.addEventListener("keydown", documentKeydown);

    renderDialog(true, onOpenChange);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(documentKeydown).not.toHaveBeenCalled();

    document.removeEventListener("keydown", documentKeydown);
  });

  // @spec SPEC-20260813-001 RF-08 — preview só aparece com veículo único em foco; modo padrão
  // "none" (toda a frota) não deve renderizar a seção de preview.
  it("RF-08: não exibe preview de veículo quando não há seleção única em foco", () => {
    renderDialog(true, vi.fn());

    expect(screen.queryByText("Ver despesas")).not.toBeInTheDocument();
    expect(screen.queryByText("Ver manutenção")).not.toBeInTheDocument();
  });
});
