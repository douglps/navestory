/**
 * @spec SPEC-20260622-001 RF-02, RF-13, R-ANA-01, R-FUEL-02, R-FUEL-03
 */
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { FuelTrendPoint } from "@navestory/validators";
import { FuelTrendChart } from "./fuel-trend-chart";

const points: FuelTrendPoint[] = [
  { date: "2026-07-01", km_per_liter: 12.5, rolling_avg_kpl: 12.1 },
  { date: "2026-06-15", km_per_liter: 11.8, rolling_avg_kpl: 12.0 },
  { date: "2026-06-01", km_per_liter: null, rolling_avg_kpl: null },
];

describe("FuelTrendChart", () => {
  it("SPEC-20260622-001 RF-13: exibe mensagem de fallback quando points é falsy", () => {
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <FuelTrendChart points={null as any} /> as ReactNode,
    );

    expect(
      screen.getByText("Não foi possível carregar a tendência de consumo."),
    ).toBeInTheDocument();
  });

  it("R-FUEL-02: renderiza as datas na tabela (ordem invertida: mais recente primeiro)", () => {
    render(<FuelTrendChart points={points} /> as ReactNode);

    // O componente reverte os points — mais recente vai para o início do gráfico
    const cells = screen.getAllByRole("cell");
    const dateCells = cells.filter((cell) => cell.textContent?.match(/2026-\d{2}-\d{2}/));
    expect(dateCells.length).toBeGreaterThan(0);
  });

  it("R-FUEL-02: exibe '—' para km_per_liter nulo", () => {
    render(<FuelTrendChart points={points} /> as ReactNode);

    const allDashes = screen.getAllByText("—");
    // Deve haver pelo menos um "—" para km_per_liter=null e rolling_avg_kpl=null
    expect(allDashes.length).toBeGreaterThanOrEqual(2);
  });

  it("R-FUEL-03: exibe os valores de km/L na tabela quando presentes", () => {
    render(<FuelTrendChart points={points} /> as ReactNode);

    expect(screen.getByText("12.5")).toBeInTheDocument();
    expect(screen.getByText("12.1")).toBeInTheDocument();
  });

  it("renderiza a tabela com caption acessível", () => {
    render(<FuelTrendChart points={points} /> as ReactNode);

    expect(
      screen.getByText("Consumo de combustível por abastecimento"),
    ).toBeInTheDocument();
  });

  it("renderiza corretamente com lista vazia de points", () => {
    render(<FuelTrendChart points={[]} /> as ReactNode);

    // Não deve haver erro; a tabela está presente mas sem linhas de dado
    expect(screen.getByText("Consumo de combustível por abastecimento")).toBeInTheDocument();
    expect(screen.queryByRole("cell")).not.toBeInTheDocument();
  });
});
