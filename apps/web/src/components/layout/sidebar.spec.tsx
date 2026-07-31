import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
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
    expect(dot).toHaveClass("bg-categorical-4");
    expect(dot.tagName).toBe("SPAN");
    expect(dot).not.toHaveAttribute("role", "button");
    expect(dot).not.toHaveAttribute("tabindex");

    act(() => {
      useUIStore.setState({ isSidebarCollapsed: false });
      useDashboardStore.getState().clearAllSelection();
    });
  });

  describe("SPEC-20260722-003 — drawer mobile", () => {
    afterEach(() => {
      useUIStore.setState({ isMobileNavOpen: false });
    });

    it("RF-06: fica fora do viewport (-translate-x-full) quando o drawer está fechado", () => {
      renderSidebar();

      expect(screen.getByRole("dialog", { hidden: true })).toHaveClass("-translate-x-full");
    });

    it("RF-06: exibe translate-x-0 quando isMobileNavOpen é true", () => {
      act(() => useUIStore.setState({ isMobileNavOpen: true }));
      renderSidebar();

      expect(screen.getByRole("dialog", { hidden: true })).toHaveClass("translate-x-0");
    });

    it("RF-07: exibe backdrop apenas quando o drawer está aberto e fecha ao clicar nele", async () => {
      const user = userEvent.setup();
      act(() => useUIStore.setState({ isMobileNavOpen: true }));
      const { container } = renderSidebar();

      const backdrop = container.querySelector('[aria-hidden="true"].fixed.inset-x-0.top-14.bottom-0') as HTMLElement;
      expect(backdrop).toBeInTheDocument();

      await user.click(backdrop);

      expect(useUIStore.getState().isMobileNavOpen).toBe(false);
    });

    it("RF-08: fecha o drawer ao pressionar Esc", async () => {
      const user = userEvent.setup();
      act(() => useUIStore.setState({ isMobileNavOpen: true }));
      renderSidebar();

      await user.keyboard("{Escape}");

      expect(useUIStore.getState().isMobileNavOpen).toBe(false);
    });
  });
});
