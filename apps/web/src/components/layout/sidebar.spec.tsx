import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  type RenderResult,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logout } from "@/lib/auth/logout";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { Sidebar } from "./sidebar";

vi.mock("@/lib/auth/logout", () => ({
  logout: vi.fn().mockResolvedValue(undefined),
}));

let mockPathname = "/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

function renderSidebar(): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
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

    expect(
      screen.getByRole("button", { name: "Recolher menu" }),
    ).toBeInTheDocument();
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

    const dot = container.querySelector(
      '[aria-hidden="true"].rounded-full',
    ) as HTMLElement;
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

      expect(screen.getByRole("dialog", { hidden: true })).toHaveClass(
        "-translate-x-full",
      );
    });

    it("RF-06: exibe translate-x-0 quando isMobileNavOpen é true", () => {
      act(() => useUIStore.setState({ isMobileNavOpen: true }));
      renderSidebar();

      expect(screen.getByRole("dialog", { hidden: true })).toHaveClass(
        "translate-x-0",
      );
    });

    it("RF-07: exibe backdrop apenas quando o drawer está aberto e fecha ao clicar nele", async () => {
      const user = userEvent.setup();
      act(() => useUIStore.setState({ isMobileNavOpen: true }));
      const { container } = renderSidebar();

      const backdrop = container.querySelector(
        '[aria-hidden="true"].fixed.inset-x-0.top-14.bottom-0',
      ) as HTMLElement;
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

  describe("SPEC-20260730-002 — hold-to-confirm logout (RF-01, RF-02, RF-03, RNF-03)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.mocked(logout).mockClear();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("RF-03: não chama logout() se o botão for solto antes de 1.000 ms", () => {
      renderSidebar();
      const button = screen.getByRole("button", { name: "Segure para sair" });

      fireEvent.mouseDown(button);
      vi.advanceTimersByTime(500);
      fireEvent.mouseUp(button);
      vi.advanceTimersByTime(600);

      expect(logout).not.toHaveBeenCalled();
    });

    it("RF-01: chama logout() somente após segurar por 1.000 ms completos", () => {
      renderSidebar();
      const button = screen.getByRole("button", { name: "Segure para sair" });

      fireEvent.mouseDown(button);
      vi.advanceTimersByTime(999);
      expect(logout).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(logout).toHaveBeenCalledTimes(1);
    });

    it("RF-03: onMouseLeave cancela o hold assim como onMouseUp", () => {
      renderSidebar();
      const button = screen.getByRole("button", { name: "Segure para sair" });

      fireEvent.mouseDown(button);
      vi.advanceTimersByTime(700);
      fireEvent.mouseLeave(button);
      vi.advanceTimersByTime(1000);

      expect(logout).not.toHaveBeenCalled();
    });

    it("RF-02, RNF-03: aria-busy reflete o progresso do hold e reseta ao cancelar", () => {
      renderSidebar();
      const button = screen.getByRole("button", { name: "Segure para sair" });

      expect(button).toHaveAttribute("aria-busy", "false");

      fireEvent.mouseDown(button);
      expect(button).toHaveAttribute("aria-busy", "true");

      fireEvent.mouseUp(button);
      expect(button).toHaveAttribute("aria-busy", "false");
    });
  });

  describe("SPEC-20260730-002 — sidebar expandida (RF-11, RF-12, RF-13)", () => {
    afterEach(() => {
      mockPathname = "/dashboard";
    });

    it("RF-11: exibe o ícone junto ao label no estado expandido", () => {
      renderSidebar();

      const link = screen.getByRole("link", { name: "Veículos" });
      expect(link.querySelector("svg")).toBeInTheDocument();
    });

    it("RF-12: destaca a rota ativa com aria-current=page", () => {
      mockPathname = "/vehicles";
      renderSidebar();

      expect(screen.getByRole("link", { name: "Veículos" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(
        screen.getByRole("link", { name: "Dashboard" }),
      ).not.toHaveAttribute("aria-current");
    });

    it("RF-12: destaca o item pai quando a rota atual é uma sub-rota dele", () => {
      mockPathname = "/settings/account/security";
      renderSidebar();

      expect(screen.getByRole("link", { name: "Minha conta" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("RF-13: não exibe mais o texto de marca 'navestory'", () => {
      renderSidebar();

      expect(screen.queryByText("navestory")).not.toBeInTheDocument();
    });
  });
});
