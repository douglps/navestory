import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FleetAlertBar, type FleetAlertItem } from "./FleetAlertBar";

function alert(overrides: Partial<FleetAlertItem>): FleetAlertItem {
  return {
    id: "a1",
    type: "maintenance_upcoming",
    vehicle_plate: "ABC1234",
    description: "Troca de óleo",
    days_until_due: 3,
    ...overrides,
  };
}

describe("FleetAlertBar", () => {
  it("RF-DA-01: não renderiza nada quando não há alertas", () => {
    const { container } = render(<FleetAlertBar alerts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("RF-DA-01: exibe descrição e prazo de cada alerta vencido/futuro", () => {
    render(
      <FleetAlertBar
        alerts={[
          alert({ id: "a1", days_until_due: -2 }),
          alert({ id: "a2", days_until_due: 0 }),
        ]}
      />,
    );

    expect(screen.getByText(/Vencido há 2 dias/)).toBeInTheDocument();
    expect(screen.getByText(/Vence hoje/)).toBeInTheDocument();
  });

  it("RF-DA-02: mostra no máximo 3 alertas e o link 'ver todos (+N)' para os demais", () => {
    const alerts = [1, 2, 3, 4, 5].map((n) => alert({ id: `a${n}`, days_until_due: n }));
    render(<FleetAlertBar alerts={alerts} />);

    expect(screen.getAllByText(/ABC1234/)).toHaveLength(3);
    const link = screen.getByRole("link", { name: "ver todos (+2)" });
    expect(link).toHaveAttribute("href", "/maintenance?filter=urgent");
  });

  it("não exibe o link de overflow quando há 3 ou menos alertas", () => {
    const alerts = [1, 2, 3].map((n) => alert({ id: `a${n}` }));
    render(<FleetAlertBar alerts={alerts} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
