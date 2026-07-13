import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("inicia como type=password com aria-label 'Mostrar senha'", () => {
    render(<PasswordInput aria-label="Senha" />);

    const input = screen.getByLabelText("Senha") as HTMLInputElement;
    expect(input.type).toBe("password");
    expect(screen.getByRole("button", { name: "Mostrar senha" })).toBeInTheDocument();
  });

  it("alterna para type=text ao clicar no toggle", () => {
    render(<PasswordInput aria-label="Senha" />);

    fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));

    const input = screen.getByLabelText("Senha") as HTMLInputElement;
    expect(input.type).toBe("text");
    expect(screen.getByRole("button", { name: "Ocultar senha" })).toBeInTheDocument();
  });
});
