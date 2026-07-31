import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Tooltip } from "./tooltip";

describe("Tooltip", () => {
  it("mostra o conteúdo ao focar o trigger", async () => {
    render(
      <Tooltip content="Detalhe completo">
        <button type="button">Alvo</button>
      </Tooltip>,
    );

    await userEvent.tab();

    expect(await screen.findByText("Detalhe completo")).toBeInTheDocument();
  });

  it("não tem violações de acessibilidade", async () => {
    const { container } = render(
      <Tooltip content="Detalhe completo">
        <button type="button">Alvo</button>
      </Tooltip>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
