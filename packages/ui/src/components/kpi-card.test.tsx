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

  // @spec SPEC-20260722-001 RF-03 — tabular-nums garante alinhamento vertical de dígitos entre KpiCards
  it("aplica tabular-nums ao valor principal", () => {
    render(<KpiCard title="Combustível" value="4.820" unit="R$" />);

    expect(screen.getByText("4.820")).toHaveClass("tabular-nums");
  });

  it("renderiza a tendência com seta de alta quando trend positivo sem reverseTrend", () => {
    render(<KpiCard title="Receita" value="100" trend={{ value: 12, label: "vs mês anterior" }} />);

    expect(screen.getByText("↑")).toBeInTheDocument();
    expect(screen.getByText("12%")).toBeInTheDocument();
    expect(screen.getByText("vs mês anterior")).toBeInTheDocument();
  });

  it("aplica cor de perigo à seta (sem fundo) quando reverseTrend e trend positivo (custo subindo)", () => {
    render(<KpiCard title="Custo" value="500" trend={{ value: 8 }} reverseTrend />);

    expect(screen.getByText("↑")).toHaveClass("text-danger");
    expect(screen.getByText("8%")).toHaveClass("text-foreground");
    expect(screen.getByText("8%")).not.toHaveClass("bg-danger-pastel");
  });

  it("renderiza sparkline com role=img e aria-label quando há histórico suficiente", () => {
    render(<KpiCard title="Combustível" value="4.820" sparkline={[100, 200, 150, 300]} />);

    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("não renderiza sparkline com um único ponto", () => {
    render(<KpiCard title="Combustível" value="4.820" sparkline={[100]} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("usa cor e seta neutra quando trend é zero", () => {
    render(<KpiCard title="Combustível" value="4.820" trend={{ value: 0 }} />);

    expect(screen.getByText("→")).toHaveClass("text-muted-foreground");
    expect(screen.getByText("0%")).toHaveClass("text-foreground");
  });

  it("aplica variant explícito 'warning' à seta e à sparkline, sem fundo no número", () => {
    render(
      <KpiCard
        title="Combustível"
        value="4.820"
        trend={{ value: 5 }}
        sparkline={[100, 200, 150]}
        variant="warning"
      />,
    );

    expect(screen.getByText("↑")).toHaveClass("text-warning");
    expect(screen.getByText("5%")).toHaveClass("text-foreground");
    expect(screen.getByRole("img").querySelector("polyline")).toHaveAttribute(
      "stroke",
      "oklch(var(--warning))",
    );
  });

  it("aplica variant explícito 'info' à seta e à sparkline, sem fundo no número", () => {
    render(
      <KpiCard
        title="Combustível"
        value="4.820"
        trend={{ value: 5 }}
        sparkline={[100, 200, 150]}
        variant="info"
      />,
    );

    expect(screen.getByText("↑")).toHaveClass("text-info");
    expect(screen.getByText("5%")).toHaveClass("text-foreground");
    expect(screen.getByRole("img").querySelector("polyline")).toHaveAttribute(
      "stroke",
      "oklch(var(--info))",
    );
  });

  it("usa cor de sucesso na sparkline quando trend positivo sem variant explícito", () => {
    render(
      <KpiCard
        title="Combustível"
        value="4.820"
        trend={{ value: 5 }}
        sparkline={[100, 200, 150]}
      />,
    );

    expect(screen.getByRole("img").querySelector("polyline")).toHaveAttribute(
      "stroke",
      "oklch(var(--success))",
    );
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

  // @spec SPEC-20260721-001 RNF-02 — cobre os variants; a cor semântica fica só na seta
  // (elemento gráfico, 3:1 não-textual), o número usa text-foreground para não falhar AA.
  it.each(["warning", "success", "info", "danger"] as const)(
    "não tem violações de acessibilidade com variant '%s'",
    async (variant) => {
      const { container } = render(
        <KpiCard title="Combustível" value="4.820" trend={{ value: 5 }} variant={variant} />,
      );
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
