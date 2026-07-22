import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { Header } from "./header";
import { MOBILE_NAV_DRAWER_ID } from "./sidebar";

// @spec SPEC-20260721-001 RF-06 — CommandPaletteTrigger no header usa `useRouter`;
// `usePathname` já era consumido pelo `ConnectivityIndicator`.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard",
}));

function renderHeader(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <Header />
    </QueryClientProvider> as ReactNode,
  );
}

describe("Header", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useDashboardStore.getState().clearAllSelection();
    useUIStore.setState({ isMobileNavOpen: false });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("RF-01: exibe o logo e o chip de contexto", async () => {
    renderHeader();

    expect(screen.getByText("Nave")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Selecionar veículo/)).toBeInTheDocument());
  });

  // @spec SPEC-20260722-003 RF-10, RF-14
  it("RF-10, RF-14: hamburger inicia fechado com aria-controls e aria-expanded corretos", () => {
    renderHeader();

    const hamburger = screen.getByRole("button", { name: "Abrir menu" });
    expect(hamburger).toHaveAttribute("aria-expanded", "false");
    expect(hamburger).toHaveAttribute("aria-controls", MOBILE_NAV_DRAWER_ID);
  });

  // @spec SPEC-20260722-003 RF-10
  it("RF-10: clicar no hamburger abre o drawer e alterna o rótulo/estado", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));

    expect(useUIStore.getState().isMobileNavOpen).toBe(true);
    const hamburger = screen.getByRole("button", { name: "Fechar menu" });
    expect(hamburger).toHaveAttribute("aria-expanded", "true");
  });
});
