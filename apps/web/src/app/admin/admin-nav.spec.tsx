import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminNav } from "./admin-nav";

describe("AdminNav", () => {
  it("SPEC-20260731-008 RF-08: exibe o título 'Painel de Administração'", () => {
    render(<AdminNav />);

    expect(screen.getByRole("heading", { name: "Painel de Administração" })).toBeInTheDocument();
  });

  it("SPEC-20260731-008 RNF-04: exibe link de retorno ao navestory apontando para /dashboard", () => {
    render(<AdminNav />);

    const link = screen.getByRole("link", { name: "Voltar ao navestory" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});
