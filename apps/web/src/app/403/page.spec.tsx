import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ForbiddenPage from "./page";

describe("ForbiddenPage (/403)", () => {
  it("SPEC-20260731-008 RF-09: exibe título 'Acesso negado'", () => {
    render(<ForbiddenPage />);

    expect(screen.getByRole("heading", { name: "Acesso negado" })).toBeInTheDocument();
  });

  it("SPEC-20260731-008 CA-06: exibe mensagem explicativa ao usuário", () => {
    render(<ForbiddenPage />);

    expect(screen.getByText(/Você não tem permissão/)).toBeInTheDocument();
  });

  it("exibe link de retorno para o dashboard", () => {
    render(<ForbiddenPage />);

    const link = screen.getByRole("link", { name: "Voltar para o painel" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});
