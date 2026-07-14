import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import OdometerCyclesPage from "./page";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

describe("OdometerCyclesPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <OdometerCyclesPage params={Promise.resolve({ vehicleId: "v1" })} />
      </QueryProvider>,
    );
  }

  it("mostra estado vazio quando não há ciclos (D2, Ciclo 1 implícito)", async () => {
    vi.mocked(apiClient).mockResolvedValue([]);
    renderPage();

    expect(
      await screen.findByText(/Nenhum reinício de odômetro registrado/),
    ).toBeInTheDocument();
  });

  it("lista os ciclos existentes (RF-22)", async () => {
    vi.mocked(apiClient).mockResolvedValue([
      {
        id: "cy1",
        cycle_number: 2,
        started_at: "2026-07-13T00:00:00Z",
        starting_value: 0,
        previous_cycle_max: 87000,
        reason: "Troca de painel",
      },
    ]);
    renderPage();

    expect(await screen.findByText("Troca de painel")).toBeInTheDocument();
    expect(screen.getByText("87000")).toBeInTheDocument();
  });

  it("cria um novo ciclo via modal (RF-08 via UI)", async () => {
    vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === "POST") {
        return Promise.resolve({ id: "cy2", cycle_number: 2 });
      }
      return Promise.resolve([]);
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Reiniciar odômetro" }));
    fireEvent.change(screen.getByLabelText("Motivo"), {
      target: { value: "Troca de painel após colisão" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/vehicles/v1/odometer-cycles",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("mostra erro de validação quando motivo é muito curto", async () => {
    vi.mocked(apiClient).mockResolvedValue([]);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Reiniciar odômetro" }));
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "ok" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
