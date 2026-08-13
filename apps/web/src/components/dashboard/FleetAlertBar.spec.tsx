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

  it("@spec SPEC-20260813-001 RF-05: agrega vencidos e próximos em contadores por severidade", () => {
    render(
      <FleetAlertBar
        alerts={[
          alert({ id: "a1", days_until_due: -2 }),
          alert({ id: "a2", days_until_due: 0 }),
          alert({ id: "a3", days_until_due: 5 }),
        ]}
      />,
    );

    expect(screen.getByText("1 vencido")).toBeInTheDocument();
    expect(screen.getByText("2 próximos")).toBeInTheDocument();
  });

  it("@spec SPEC-20260813-001 RF-05: exibe apenas o contador de severidade presente", () => {
    render(<FleetAlertBar alerts={[alert({ id: "a1", days_until_due: 3 })]} />);

    expect(screen.queryByText(/vencido/)).not.toBeInTheDocument();
    expect(screen.getByText("1 próximo")).toBeInTheDocument();
  });

  it("@spec SPEC-20260813-001 RF-05: link 'Ver alertas' aponta para /maintenance?filter=urgent", () => {
    render(<FleetAlertBar alerts={[alert({ id: "a1" })]} />);

    const link = screen.getByRole("link", { name: "Ver alertas" });
    expect(link).toHaveAttribute("href", "/maintenance?filter=urgent");
  });
});
