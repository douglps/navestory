import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { Sidebar } from "./sidebar";

function renderSidebar(): RenderResult {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
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

  it("RF-15: não renderiza mais o FocusSlot", () => {
    renderSidebar();

    expect(screen.queryByText(/Em foco/)).not.toBeInTheDocument();
  });

  it("RF-16: exibe o dot passivo com a cor do modo ativo quando colapsado, sem interação", () => {
    act(() => {
      useUIStore.setState({ isSidebarCollapsed: true });
      useDashboardStore.getState().setActiveVehicle("v1");
    });

    const { container } = renderSidebar();

    const dot = container.querySelector('[aria-hidden="true"].rounded-full') as HTMLElement;
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("bg-amber-400");
    expect(dot.tagName).toBe("SPAN");
    expect(dot).not.toHaveAttribute("role", "button");
    expect(dot).not.toHaveAttribute("tabindex");

    act(() => {
      useUIStore.setState({ isSidebarCollapsed: false });
      useDashboardStore.getState().clearAllSelection();
    });
  });
});
