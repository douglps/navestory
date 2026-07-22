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
    expect(trendText).toHaveClass("bg-danger-pastel", "text-foreground");
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

    const trendText = screen.getByText(/→ 0%/);
    expect(trendText).toHaveClass("text-muted-foreground");
    expect(trendText).not.toHaveClass("bg-success-pastel", "bg-danger-pastel", "bg-warning-pastel", "bg-info-pastel");
  });

  it("aplica variant explícito 'warning' ao texto e à sparkline", () => {
    render(
      <KpiCard
        title="Combustível"
        value="4.820"
        trend={{ value: 5 }}
        sparkline={[100, 200, 150]}
        variant="warning"
      />,
    );

    expect(screen.getByText(/↑ 5%/)).toHaveClass("bg-warning-pastel", "text-foreground");
    expect(screen.getByRole("img").querySelector("polyline")).toHaveAttribute(
      "stroke",
      "oklch(var(--warning))",
    );
  });

  it("aplica variant explícito 'info' ao texto e à sparkline", () => {
    render(
      <KpiCard
        title="Combustível"
        value="4.820"
        trend={{ value: 5 }}
        sparkline={[100, 200, 150]}
        variant="info"
      />,
    );

    expect(screen.getByText(/↑ 5%/)).toHaveClass("bg-info-pastel", "text-foreground");
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

  // @spec SPEC-20260721-001 RNF-02 — cobre os variants que falhavam AA quando o texto usava
  // text-{variant} direto sobre --card (warning ~2.1:1, info ~4.2:1, success ~3.4:1).
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
