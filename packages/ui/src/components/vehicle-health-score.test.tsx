import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { VehicleHealthScore } from "./vehicle-health-score";

describe("VehicleHealthScore", () => {
  it("RF-SH-02: score >= 70 mapeia para tier 'success' (Em dia)", () => {
    render(<VehicleHealthScore score={80} />);
    expect(screen.getByRole("img", { name: /Saúde: 80 de 100 — Em dia/ })).toBeInTheDocument();
  });

  it("RF-SH-02: score entre 40 e 69 mapeia para tier 'warning' (Atenção)", () => {
    render(<VehicleHealthScore score={50} />);
    expect(screen.getByRole("img", { name: /Saúde: 50 de 100 — Atenção/ })).toBeInTheDocument();
  });

  it("RF-SH-02: score abaixo de 40 mapeia para tier 'danger' (Crítico)", () => {
    render(<VehicleHealthScore score={20} />);
    expect(screen.getByRole("img", { name: /Saúde: 20 de 100 — Crítico/ })).toBeInTheDocument();
  });

  it("RF-02: score undefined renderiza estado neutro sem número centralizado", () => {
    render(<VehicleHealthScore score={undefined} />);
    expect(screen.getByRole("img", { name: "Calculando saúde do veículo" })).toBeInTheDocument();
  });

  it("RF-02: aceita prop de tamanho customizado", () => {
    render(<VehicleHealthScore score={80} size={24} />);
    const el = screen.getByRole("img", { name: /Saúde: 80/ });
    expect(el).toHaveStyle({ width: "24px", height: "24px" });
  });
});
