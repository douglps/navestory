import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SeasonalHeatmapCell } from "@navestory/validators";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

vi.mock("@/lib/hooks/use-current-user", () => ({
  useCurrentUser: vi.fn(),
}));

import { apiClient } from "@/lib/http/api-client";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { EASTER_EGG_SEEN_KEY } from "@/lib/analytics/easter-egg-heatmap";
import { EasterEggHeatmapWidget } from "./EasterEggHeatmapWidget";

function cell(monthNumber: number, category: string): SeasonalHeatmapCell {
  return { month_number: monthNumber, category, avg_amount: 100, occurrence_count: 1 };
}

function lockedCells(): SeasonalHeatmapCell[] {
  return [cell(1, "fuel"), cell(2, "fuel")];
}

function unlockedCells(): SeasonalHeatmapCell[] {
  return [1, 2, 3, 4, 5].flatMap((month) => [cell(month, "fuel"), cell(month, "maintenance")]);
}

function renderWidget() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <EasterEggHeatmapWidget />
    </QueryClientProvider> as ReactNode,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  (useCurrentUser as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { id: "u1", name: "Ana", email: "ana@example.com", created_at: null },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

/**
 * @spec SPEC-20260801-001
 */
describe("EasterEggHeatmapWidget", () => {
  it("não renderiza nada sem dados de sazonalidade", async () => {
    (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { container } = renderWidget();

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalled();
    });
    expect(container.firstChild).toBeNull();
  });

  it("RF-01: renderiza o grid latente (botão desabilitado) abaixo do limiar de desbloqueio", async () => {
    (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(lockedCells());
    renderWidget();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Visualização de padrões de gasto" }),
      ).toBeDisabled();
    });
  });

  it("RF-03: desbloqueia o widget (botão habilitado) com >= 40% de presença mensal", async () => {
    (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(unlockedCells());
    renderWidget();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Visualização de padrões de gasto" }),
      ).toBeEnabled();
    });
  });

  it("RF-04: clicar no widget desbloqueado abre o diagrama de coocorrência", async () => {
    (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(unlockedCells());
    const user = userEvent.setup();
    renderWidget();

    const button = await screen.findByRole("button", {
      name: "Visualização de padrões de gasto",
    });
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByRole("img", {
          name: "Diagrama de categorias relacionadas",
        }),
      ).toBeInTheDocument();
    });
  });

  it("RF-02: exibe o ponto pulsante nos primeiros 7 dias sem interação e sem desbloqueio", async () => {
    (useCurrentUser as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { id: "u1", name: "Ana", email: null, created_at: new Date().toISOString() },
    });
    (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(lockedCells());
    const { container } = renderWidget();

    await waitFor(() => {
      expect(container.querySelector(".animate-pulse")).not.toBeNull();
    });
  });

  it("RF-02: hover no widget marca como visto e persiste em localStorage", async () => {
    (useCurrentUser as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { id: "u1", name: "Ana", email: null, created_at: new Date().toISOString() },
    });
    (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(lockedCells());
    const user = userEvent.setup();
    const { container } = renderWidget();

    await waitFor(() => {
      expect(container.querySelector(".animate-pulse")).not.toBeNull();
    });

    const wrapper = container.firstChild as HTMLElement;
    await user.hover(wrapper);

    await waitFor(() => {
      expect(localStorage.getItem(EASTER_EGG_SEEN_KEY)).toBe("true");
      expect(container.querySelector(".animate-pulse")).toBeNull();
    });
  });

  it("RF-02: não exibe o ponto pulsante quando já foi marcado como visto", async () => {
    localStorage.setItem(EASTER_EGG_SEEN_KEY, "true");
    (useCurrentUser as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { id: "u1", name: "Ana", email: null, created_at: new Date().toISOString() },
    });
    (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(lockedCells());
    const { container } = renderWidget();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Visualização de padrões de gasto" }),
      ).toBeInTheDocument();
    });
    expect(container.querySelector(".animate-pulse")).toBeNull();
  });
});
