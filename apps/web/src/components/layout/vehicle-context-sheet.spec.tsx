import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { VehicleContextSheet } from "./vehicle-context-sheet";

vi.mock("./vehicle-switcher-content", () => ({
  VehicleSwitcherContent: ({ onClose }: { onClose: () => void }) => (
    <button type="button" onClick={onClose}>
      fechar conteúdo
    </button>
  ),
}));

describe("VehicleContextSheet", () => {
  it("não renderiza o conteúdo quando open é false", () => {
    render(
      <VehicleContextSheet open={false} onOpenChange={vi.fn()} /> as ReactNode,
    );

    expect(
      screen.queryByRole("button", { name: "fechar conteúdo" }),
    ).not.toBeInTheDocument();
  });

  it("renderiza o conteúdo e repassa onClose do VehicleSwitcherContent para onOpenChange(false)", () => {
    const onOpenChange = vi.fn();
    render(
      <VehicleContextSheet open onOpenChange={onOpenChange} /> as ReactNode,
    );

    fireEvent.click(screen.getByRole("button", { name: "fechar conteúdo" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
