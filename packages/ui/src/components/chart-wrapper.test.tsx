import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { ChartWrapper } from "./chart-wrapper";

describe("ChartWrapper", () => {
  it("renderiza título, descrição e children quando há dados", () => {
    render(
      <ChartWrapper title="Despesas por Categoria" description="Últimos 6 meses">
        <div>gráfico</div>
      </ChartWrapper>,
    );

    expect(screen.getByText("Despesas por Categoria")).toBeInTheDocument();
    expect(screen.getByText("Últimos 6 meses")).toBeInTheDocument();
    expect(screen.getByText("gráfico")).toBeInTheDocument();
  });

  it("mostra skeleton de loading e oculta children", () => {
    render(
      <ChartWrapper title="Despesas" loading>
        <div>gráfico</div>
      </ChartWrapper>,
    );

    expect(screen.getByRole("status", { name: "Carregando gráfico" })).toBeInTheDocument();
    expect(screen.queryByText("gráfico")).not.toBeInTheDocument();
  });

  it("mostra mensagem de vazio quando isEmpty", () => {
    render(
      <ChartWrapper title="Despesas" isEmpty emptyMessage="Sem despesas no período">
        <div>gráfico</div>
      </ChartWrapper>,
    );

    expect(screen.getByText("Sem despesas no período")).toBeInTheDocument();
    expect(screen.queryByText("gráfico")).not.toBeInTheDocument();
  });

  it("renderiza as actions", () => {
    render(
      <ChartWrapper title="Despesas" actions={<button type="button">Exportar</button>}>
        <div>gráfico</div>
      </ChartWrapper>,
    );

    expect(screen.getByRole("button", { name: "Exportar" })).toBeInTheDocument();
  });

  it("não possui violações de acessibilidade", async () => {
    const { container } = render(
      <ChartWrapper title="Despesas por Categoria" description="Últimos 6 meses">
        <div>gráfico</div>
      </ChartWrapper>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
