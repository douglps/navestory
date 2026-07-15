import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sidebar } from "./sidebar";

function renderSidebar(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <Sidebar />
    </QueryClientProvider>,
  );
}

describe("Sidebar", () => {
  it("exibe os links de navegação principais", () => {
    renderSidebar();

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Veículos" })).toHaveAttribute(
      "href",
      "/vehicles",
    );
    expect(screen.getByRole("link", { name: "Despesas" })).toHaveAttribute(
      "href",
      "/expenses",
    );
    expect(screen.getByRole("link", { name: "Manutenções" })).toHaveAttribute(
      "href",
      "/maintenance",
    );
  });

  it("exibe o botão de recolher/expandir o menu", () => {
    renderSidebar();

    expect(screen.getByRole("button", { name: "Recolher menu" })).toBeInTheDocument();
  });
});
