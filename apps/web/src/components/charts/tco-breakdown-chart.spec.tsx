/**
 * @spec SPEC-20260622-001 RF-01, RF-13, R-ANA-04
 */
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { VehicleTco } from "@navestory/validators";
import { TcoBreakdownChart } from "./tco-breakdown-chart";

const breakdown: VehicleTco["breakdown"] = {
  fuel: 500.0,
  maintenance: 350.0,
  fines: 195.23,
  recurring: 120.0,
  other: 75.5,
};

describe("TcoBreakdownChart", () => {
  it("SPEC-20260622-001 RF-13: exibe mensagem de fallback quando breakdown é falsy", () => {
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <TcoBreakdownChart breakdown={null as any} /> as ReactNode,
    );

    expect(
      screen.getByText("Não foi possível carregar o breakdown de custos."),
    ).toBeInTheDocument();
  });

  it("SPEC-20260622-001 RF-01: renderiza as categorias do breakdown na tabela", () => {
    render(<TcoBreakdownChart breakdown={breakdown} /> as ReactNode);

    // Cada categoria pode aparecer tanto na tabela quanto no eixo X do recharts
    expect(screen.getAllByText("Combustível").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Manutenção").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Multas").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Custos recorrentes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Outros").length).toBeGreaterThanOrEqual(1);
  });

  it("R-ANA-04: formata os valores em BRL na tabela de dados", () => {
    render(<TcoBreakdownChart breakdown={breakdown} /> as ReactNode);

    // R$ 500,00 para fuel
    expect(screen.getByText(/500,00/)).toBeInTheDocument();
    // R$ 195,23 para fines
    expect(screen.getByText(/195,23/)).toBeInTheDocument();
  });

  it("renderiza a tabela com caption acessível", () => {
    render(<TcoBreakdownChart breakdown={breakdown} /> as ReactNode);

    expect(screen.getByText("Breakdown de custo por categoria")).toBeInTheDocument();
  });
});
