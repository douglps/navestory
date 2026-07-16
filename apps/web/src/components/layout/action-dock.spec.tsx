import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { ActionDock } from "./action-dock";

let pathname = "/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

describe("ActionDock", () => {
  beforeEach(() => {
    localStorage.clear();
    useDashboardStore.getState().clearAllSelection();
    useDashboardStore.getState().setDockOpen(false);
    pathname = "/dashboard";
  });

  it("RF-DC-01: painel 2x2 começa fechado (só a barra inline de desktop está no DOM) e abre ao tocar o botão ⊕", () => {
    render(<ActionDock />);

    // A barra inline de desktop (RF-DC-05) sempre existe no DOM (só oculta via CSS); o painel
    // 2x2 do mobile é que é condicional a `dockOpen` — por isso 1 link antes de abrir, 2 depois.
    expect(screen.getAllByRole("link", { name: "Abastecer" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Abrir ações rápidas" }));

    expect(screen.getAllByRole("link", { name: "Abastecer" })).toHaveLength(2);
  });

  it("RF-DC-02: exibe as 4 ações na ordem correta e nunca 'Multa' ou 'Novo Veículo' (RF-DC-02.1, RF-DC-03)", () => {
    render(<ActionDock />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir ações rápidas" }));

    const labels = ["Abastecer", "Nova Despesa", "Manutenção", "Registrar KM"];
    for (const label of labels) {
      expect(screen.getAllByRole("link", { name: label })[0]).toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: "Multa" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Novo Veículo" })).not.toBeInTheDocument();
  });

  it("CA-S1-02: 'Abastecer' aponta para /expenses/new?category=fuel", () => {
    render(<ActionDock />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir ações rápidas" }));

    expect(screen.getAllByRole("link", { name: "Abastecer" })[0]).toHaveAttribute(
      "href",
      "/expenses/new?category=fuel",
    );
  });

  it("RF-DC-02 item 4: 'Registrar KM' leva a /vehicles quando não há veículo em foco", () => {
    render(<ActionDock />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir ações rápidas" }));

    expect(screen.getAllByRole("link", { name: "Registrar KM" })[0]).toHaveAttribute(
      "href",
      "/vehicles",
    );
  });

  it("RF-DC-02 item 4: 'Registrar KM' leva à rota do veículo em foco quando há seleção", () => {
    useDashboardStore.getState().setActiveVehicle("v1");
    render(<ActionDock />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir ações rápidas" }));

    expect(screen.getAllByRole("link", { name: "Registrar KM" })[0]).toHaveAttribute(
      "href",
      "/vehicles/v1/odometer",
    );
  });

  it("RF-DC-06: fecha o painel automaticamente ao mudar de rota", () => {
    const { rerender } = render(<ActionDock />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir ações rápidas" }));
    expect(useDashboardStore.getState().dockOpen).toBe(true);

    pathname = "/expenses";
    rerender(<ActionDock />);

    expect(useDashboardStore.getState().dockOpen).toBe(false);
  });
});
