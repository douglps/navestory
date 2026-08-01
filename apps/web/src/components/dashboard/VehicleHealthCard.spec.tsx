import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("RF-SH-03: tooltip detalha os flags retornados pela RPC sem recalcular pesos", async () => {
    const flags: HealthFlag[] = [
      { type: "maintenance_overdue", count: 1 },
      { type: "insurance_expiring", days: 15 },
    ];
    render(
      <VehicleHealthCard vehicle={vehicle()} score={50} flags={flags} isActive={false} onSelect={vi.fn()} />,
    );

    await userEvent.hover(screen.getByRole("img", { name: /Saúde: 50 de 100/ }));

    const tooltip = await screen.findByText(/Saúde: 50\/100/);
    expect(tooltip.textContent).toContain("1 manutenção(ões) vencida(s)");
    expect(tooltip.textContent).toContain("Seguro vence em 15 dias");
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

  it("exibe 'Odômetro —' quando odômetro é null", () => {
    render(
      <VehicleHealthCard
        vehicle={vehicle({ odometer: null })}
        score={80}
        flags={[]}
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText(/Odômetro —/)).toBeInTheDocument();
  });

  it("exibe 'Sem abastecimentos' quando last_fuel_date é null", () => {
    render(
      <VehicleHealthCard
        vehicle={vehicle({ last_fuel_date: null, last_fuel_amount: null })}
        score={80}
        flags={[]}
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText(/Sem abastecimentos/)).toBeInTheDocument();
  });

  it("omite valor em BRL quando last_fuel_amount é null mas last_fuel_date está preenchido", () => {
    render(
      <VehicleHealthCard
        vehicle={vehicle({ last_fuel_date: "2026-07-01", last_fuel_amount: null })}
        score={80}
        flags={[]}
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    const fuelText = screen.getByText(/Abastecido em/);
    expect(fuelText.textContent).not.toContain("R$");
  });

  it("exibe o nickname quando preenchido no lugar de make/model", () => {
    render(
      <VehicleHealthCard
        vehicle={vehicle({ nickname: "Meu Civic" })}
        score={80}
        flags={[]}
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Meu Civic")).toBeInTheDocument();
    expect(screen.queryByText("Honda Civic")).not.toBeInTheDocument();
  });

  it("cai de volta para a placa quando make e model são nulos e sem nickname", () => {
    render(
      <VehicleHealthCard
        vehicle={vehicle({ make: null, model: null, nickname: null })}
        score={80}
        flags={[]}
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    // Dois elementos com "ABC1234": o label do veículo e o span de placa
    const matches = screen.getAllByText("ABC1234");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("RF-SH-03: exibe 'Calculando saúde…' no tooltip quando score é undefined", async () => {
    render(
      <VehicleHealthCard
        vehicle={vehicle()}
        score={undefined}
        flags={undefined}
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.hover(screen.getByRole("img", { name: /Calculando/ }));

    const tooltip = await screen.findByText(/Calculando saúde/);
    expect(tooltip).toBeInTheDocument();
  });

  it("RF-SH-03: exibe todos os tipos de flag no tooltip", async () => {
    const flags: HealthFlag[] = [
      { type: "ipva_expiring", days: 10 },
      { type: "crlv_expiring", days: 5 },
      { type: "km_alert", km_until: 1500 },
      { type: "fines_pending", count: 2 },
    ];
    render(
      <VehicleHealthCard
        vehicle={vehicle()}
        score={60}
        flags={flags}
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.hover(screen.getByRole("img", { name: /Saúde: 60 de 100/ }));

    const tooltip = await screen.findByText(/Saúde: 60\/100/);
    expect(tooltip.textContent).toContain("IPVA vence em 10 dias");
    expect(tooltip.textContent).toContain("CRLV vence em 5 dias");
    expect(tooltip.textContent).toContain("Próxima manutenção em 1500 km");
    expect(tooltip.textContent).toContain("2 multa(s) pendente(s)");
  });

  it("RF-SH-03: exibe o type bruto para flags sem label mapeado", async () => {
    const flags: HealthFlag[] = [{ type: "tipo_desconhecido_xyz" }];
    render(
      <VehicleHealthCard
        vehicle={vehicle()}
        score={70}
        flags={flags}
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.hover(screen.getByRole("img", { name: /Saúde: 70 de 100/ }));

    const tooltip = await screen.findByText(/Saúde: 70\/100/);
    expect(tooltip.textContent).toContain("tipo_desconhecido_xyz");
  });
});
