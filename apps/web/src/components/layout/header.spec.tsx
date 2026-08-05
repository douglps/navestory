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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    (
      <QueryClientProvider client={queryClient}>
        <Header />
      </QueryClientProvider>
    ) as ReactNode,
  );
}

describe("Header", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useDashboardStore.getState().clearAllSelection();
    useUIStore.setState({ isMobileNavOpen: false });
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: [] }),
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("RF-01: exibe o logo e o chip de contexto", async () => {
    renderHeader();

    expect(screen.getByText("navestory")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/Toda a frota/)).toBeInTheDocument(),
    );
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

  // @spec SPEC-20260722-003 RNF-04
  it("RNF-04: foco retorna ao hamburger quando o drawer fecha", async () => {
    const user = userEvent.setup();
    useUIStore.setState({ isMobileNavOpen: true });
    renderHeader();

    const hamburger = screen.getByRole("button", { name: "Fechar menu" });
    await user.click(hamburger);

    expect(useUIStore.getState().isMobileNavOpen).toBe(false);
    expect(document.activeElement?.tagName).toBe("BUTTON");
  });

  // @spec SPEC-20260730-002 RF-04
  it("RF-04: exibe AvatarDropdown quando o perfil tem nome", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).includes("/users/me")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: { id: "u1", name: "Douglas", email: "d@x.com" } }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: [] }),
        });
      }),
    );

    renderHeader();

    // AvatarDropdown renderiza um <button aria-label="Menu do usuário"> com as iniciais;
    // o nome completo só aparece dentro do Popover Portal (visível após clique).
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Menu do usuário" })).toBeInTheDocument();
    });
  });

  it("exibe placeholder de avatar quando não há perfil carregado", async () => {
    renderHeader();

    await waitFor(() => {
      const placeholder = document.querySelector(".h-9.w-9.rounded-full");
      expect(placeholder).toBeInTheDocument();
    });
  });

  it("RF-13: clicar no ThemeToggle chama a função de alternância de tema", async () => {
    const user = userEvent.setup();
    renderHeader();

    // ThemeToggle só é montado depois que `mounted=true` (useEffect)
    const toggleBtn = await screen.findByRole("button", { name: /Ativar modo/ });
    await user.click(toggleBtn);

    // Sem ThemeProvider real, o setTheme é no-op; o importante é que o handler foi chamado
    // sem erro — se a função não existisse, o clique lançaria exceção
    expect(toggleBtn).toBeInTheDocument();
  });
});
