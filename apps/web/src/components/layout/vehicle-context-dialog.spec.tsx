import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { VehicleContextDialog } from "./vehicle-context-dialog";

vi.mock("./vehicle-switcher-content", () => ({
  VehicleSwitcherContent: ({ onClose }: { onClose: () => void }) => (
    <button type="button" onClick={onClose}>
      fechar conteúdo
    </button>
  ),
}));

describe("VehicleContextDialog", () => {
  it("não renderiza o dialog quando open é false", () => {
    render(
      <VehicleContextDialog open={false} onOpenChange={vi.fn()} /> as ReactNode,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza o conteúdo e repassa onClose do VehicleSwitcherContent para onOpenChange(false)", () => {
    const onOpenChange = vi.fn();
    render(
      <VehicleContextDialog open onOpenChange={onOpenChange} /> as ReactNode,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "fechar conteúdo" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // @spec SPEC-20260603-001 RF-08 — Esc não deve propagar para o handler global do sidebar
  it("RF-08: Escape fecha o dialog sem propagar para o document", () => {
    const onOpenChange = vi.fn();
    const documentKeydown = vi.fn();
    document.addEventListener("keydown", documentKeydown);

    render(
      <VehicleContextDialog open onOpenChange={onOpenChange} /> as ReactNode,
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(documentKeydown).not.toHaveBeenCalled();

    document.removeEventListener("keydown", documentKeydown);
  });
});
