import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { KpiCard } from "./kpi-card";

describe("KpiCard", () => {
  it("renderiza título, valor e unidade", () => {
    render(<KpiCard title="Combustível" value="4.820" unit="R$" />);

    expect(screen.getByText("Combustível")).toBeInTheDocument();
    expect(screen.getByText("4.820")).toBeInTheDocument();
    expect(screen.getByText("R$")).toBeInTheDocument();
  });

  it("renderiza a tendência com seta de alta quando trend positivo sem reverseTrend", () => {
    render(<KpiCard title="Receita" value="100" trend={{ value: 12, label: "vs mês anterior" }} />);

    expect(screen.getByText(/↑ 12%/)).toBeInTheDocument();
    expect(screen.getByText("vs mês anterior")).toBeInTheDocument();
  });

  it("aplica cor de perigo quando reverseTrend e trend positivo (custo subindo)", () => {
    render(<KpiCard title="Custo" value="500" trend={{ value: 8 }} reverseTrend />);

    const trendText = screen.getByText(/↑ 8%/);
    expect(trendText).toHaveClass("text-danger");
  });

  it("renderiza sparkline com role=img e aria-label quando há histórico suficiente", () => {
    render(<KpiCard title="Combustível" value="4.820" sparkline={[100, 200, 150, 300]} />);

    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("não renderiza sparkline com um único ponto", () => {
    render(<KpiCard title="Combustível" value="4.820" sparkline={[100]} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("exibe skeleton quando loading=true, sem o valor real", () => {
    render(<KpiCard title="Combustível" value="4.820" loading />);

    expect(screen.queryByText("4.820")).not.toBeInTheDocument();
  });

  it("não tem violações de acessibilidade (estado padrão, com trend e sparkline)", async () => {
    const { container } = render(
      <KpiCard
        title="Combustível"
        value="R$ 4.820"
        icon="⛽"
        trend={{ value: 12, label: "vs mês anterior" }}
        sparkline={[2100, 2800, 3200, 3900, 4100, 4200, 4820]}
        reverseTrend
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("não tem violações de acessibilidade no estado loading", async () => {
    const { container } = render(<KpiCard title="Combustível" value="4.820" loading />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
