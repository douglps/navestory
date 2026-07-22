import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VehicleHealthCard, type HealthFlag, type VehicleCardData } from "./VehicleHealthCard";

function vehicle(overrides: Partial<VehicleCardData> = {}): VehicleCardData {
  return {
    id: "v1",
    plate: "ABC1234",
    make: "Honda",
    model: "Civic",
    nickname: null,
    odometer: 50_000,
    last_fuel_date: "2026-07-01",
    last_fuel_amount: 200,
    last_fuel_odometer_missing: false,
    documents: { ipva: "ok", insurance: "ok", crlv: "ok" },
    ...overrides,
  };
}

describe("VehicleHealthCard", () => {
  it("RF-DA-04: exibe placa, modelo, odômetro e último abastecimento", () => {
    render(
      <VehicleHealthCard
        vehicle={vehicle()}
        score={80}
        flags={[]}
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Honda Civic")).toBeInTheDocument();
    expect(screen.getByText("ABC1234")).toBeInTheDocument();
    expect(screen.getByText(/50\.000 km/)).toBeInTheDocument();
    expect(screen.getByText(/Abastecido em/)).toBeInTheDocument();
  });

  it("RF-DA-05: clicar no card chama onSelect com o id do veículo", () => {
    const onSelect = vi.fn();
    render(
      <VehicleHealthCard vehicle={vehicle()} score={80} flags={[]} isActive={false} onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ver análise de Honda Civic/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("RF-SH-02: score >= 70 mapeia para tier 'success' (Em dia) no VehicleHealthScore", () => {
    render(
      <VehicleHealthCard vehicle={vehicle()} score={80} flags={[]} isActive={false} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("img", { name: /Saúde: 80 de 100 — Em dia/ })).toBeInTheDocument();
  });

  it("RF-SH-02: score entre 40 e 69 mapeia para tier 'warning' (Atenção) no VehicleHealthScore", () => {
    render(
      <VehicleHealthCard vehicle={vehicle()} score={50} flags={[]} isActive={false} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("img", { name: /Saúde: 50 de 100 — Atenção/ })).toBeInTheDocument();
  });

  it("RF-SH-02: score abaixo de 40 mapeia para tier 'danger' (Crítico) no VehicleHealthScore", () => {
    render(
      <VehicleHealthCard vehicle={vehicle()} score={20} flags={[]} isActive={false} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("img", { name: /Saúde: 20 de 100 — Crítico/ })).toBeInTheDocument();
  });

  it("RF-SH-03: tooltip detalha os flags retornados pela RPC sem recalcular pesos", () => {
    const flags: HealthFlag[] = [
      { type: "maintenance_overdue", count: 1 },
      { type: "insurance_expiring", days: 15 },
    ];
    render(
      <VehicleHealthCard vehicle={vehicle()} score={50} flags={flags} isActive={false} onSelect={vi.fn()} />,
    );

    const title = screen.getByTitle(/Saúde: 50\/100/).getAttribute("title");
    expect(title).toContain("1 manutenção(ões) vencida(s)");
    expect(title).toContain("Seguro vence em 15 dias");
  });

  it("RF-DA-04: exibe badges apenas para documentos em atenção ou vencidos", () => {
    render(
      <VehicleHealthCard
        vehicle={vehicle({ documents: { ipva: "overdue", insurance: "attention", crlv: "ok" } })}
        score={80}
        flags={[]}
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("IPVA Vencido")).toBeInTheDocument();
    expect(screen.getByText("Seguro Atenção")).toBeInTheDocument();
    expect(screen.queryByText(/CRLV/)).not.toBeInTheDocument();
  });

  it("CA-S3-03: exibe aviso quando o último abastecimento não tem odômetro", () => {
    render(
      <VehicleHealthCard
        vehicle={vehicle({ last_fuel_odometer_missing: true })}
        score={80}
        flags={[]}
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Último abastecimento sem odômetro registrado")).toBeInTheDocument();
  });
});
