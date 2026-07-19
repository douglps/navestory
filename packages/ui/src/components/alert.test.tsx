import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Alert } from "./alert";

describe("Alert", () => {
  it("renderiza título, descrição e role=alert", () => {
    render(
      <Alert variant="warning" title="Manutenção vencida" description="ABC-1234 está atrasada." />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Manutenção vencida");
    expect(alert).toHaveTextContent("ABC-1234 está atrasada.");
  });

  it("dispara onClick da action", async () => {
    const onClick = vi.fn();
    render(
      <Alert
        variant="info"
        description="Informação."
        action={{ label: "Ver veículo", onClick }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Ver veículo" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("dispara onDismiss ao clicar em fechar", async () => {
    const onDismiss = vi.fn();
    render(<Alert variant="error" description="Falha." onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("não renderiza botão de fechar sem onDismiss", () => {
    render(<Alert variant="success" description="Sucesso." />);
    expect(screen.queryByRole("button", { name: "Fechar" })).not.toBeInTheDocument();
  });

  it.each(["info", "success", "warning", "error"] as const)(
    "não tem violações de acessibilidade na variante %s",
    async (variant) => {
      const { container } = render(
        <Alert
          variant={variant}
          title="Título"
          description="Descrição do alerta."
          action={{ label: "Ação", onClick: () => {} }}
          onDismiss={() => {}}
        />,
      );
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
