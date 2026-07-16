import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VehicleHealthCard, type VehicleCardData } from "./VehicleHealthCard";

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
    documents: { ipva: "ok", insurance: "ok", crlv: "ok" },
    ...overrides,
  };
}

describe("VehicleHealthCard", () => {
  it("RF-DA-04: exibe placa, modelo, odômetro e último abastecimento", () => {
    render(<VehicleHealthCard vehicle={vehicle()} score={80} isActive={false} onSelect={vi.fn()} />);

    expect(screen.getByText("Honda Civic")).toBeInTheDocument();
    expect(screen.getByText("ABC1234")).toBeInTheDocument();
    expect(screen.getByText(/50\.000 km/)).toBeInTheDocument();
    expect(screen.getByText(/Abastecido em/)).toBeInTheDocument();
  });

  it("RF-DA-05: clicar no card chama onSelect com o id do veículo", () => {
    const onSelect = vi.fn();
    render(<VehicleHealthCard vehicle={vehicle()} score={80} isActive={false} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /Ver análise de Honda Civic/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("RF-SH-02: score >= 70 mapeia para semáforo verde", () => {
    render(<VehicleHealthCard vehicle={vehicle()} score={80} isActive={false} onSelect={vi.fn()} />);
    expect(screen.getByTitle("Saúde: 80/100")).toHaveClass("bg-green-500");
  });

  it("RF-SH-02: score entre 40 e 69 mapeia para semáforo amarelo", () => {
    render(<VehicleHealthCard vehicle={vehicle()} score={50} isActive={false} onSelect={vi.fn()} />);
    expect(screen.getByTitle("Saúde: 50/100")).toHaveClass("bg-amber-500");
  });

  it("RF-SH-02: score abaixo de 40 mapeia para semáforo vermelho", () => {
    render(<VehicleHealthCard vehicle={vehicle()} score={20} isActive={false} onSelect={vi.fn()} />);
    expect(screen.getByTitle("Saúde: 20/100")).toHaveClass("bg-red-500");
  });

  it("RF-DA-04: exibe badges apenas para documentos em atenção ou vencidos", () => {
    render(
      <VehicleHealthCard
        vehicle={vehicle({ documents: { ipva: "overdue", insurance: "attention", crlv: "ok" } })}
        score={80}
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("IPVA Vencido")).toBeInTheDocument();
    expect(screen.getByText("Seguro Atenção")).toBeInTheDocument();
    expect(screen.queryByText(/CRLV/)).not.toBeInTheDocument();
  });
});
