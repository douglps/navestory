import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackLink } from "./back-link";

const backMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: backMock }),
}));

describe("BackLink", () => {
  afterEach(() => {
    backMock.mockClear();
    vi.restoreAllMocks();
  });

  it("renderiza um link estático apontando para o fallback", () => {
    render(<BackLink fallback="/dashboard" /> as ReactNode);

    const link = screen.getByRole("link", { name: "Voltar" });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("aceita label e className customizados", () => {
    render(
      <BackLink fallback="/dashboard" label="Cancelar" className="custom" /> as ReactNode,
    );

    const link = screen.getByRole("link", { name: "Cancelar" });
    expect(link).toHaveClass("custom");
  });

  it("com histórico de navegação, previne o default e chama router.back()", () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(2);
    render(<BackLink fallback="/dashboard" /> as ReactNode);

    fireEvent.click(screen.getByRole("link", { name: "Voltar" }));

    expect(backMock).toHaveBeenCalledOnce();
  });

  it("sem histórico de navegação, deixa o Link navegar normalmente", () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);
    render(<BackLink fallback="/dashboard" /> as ReactNode);

    fireEvent.click(screen.getByRole("link", { name: "Voltar" }));

    expect(backMock).not.toHaveBeenCalled();
  });
});
