import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import MaintenancePage from "./page";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

function mockApi(overrides: Record<string, unknown> = {}) {
  vi.mocked(apiClient).mockImplementation((path: string) => {
    if (path === "/maintenances?limit=100")
      return Promise.resolve(overrides.maintenances ?? []) as never;
    if (path === "/vehicles") return Promise.resolve(overrides.vehicles ?? []) as never;
    return Promise.reject(new Error(`unexpected path: ${path}`));
  });
}

describe("MaintenancePage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <MaintenancePage />
      </QueryProvider>,
    );
  }

  it("lista as manutenções com veículo resolvido (RF-15)", async () => {
    mockApi({
      maintenances: [
        {
          id: "m1",
          vehicle_id: "v1",
          description: "Troca de óleo",
          status: "scheduled",
          scheduled_date: "2026-08-01",
          cost: null,
        },
      ],
      vehicles: [{ id: "v1", plate: "ABC1234", make: "Fiat", model: "Uno", nickname: null }],
    });
    renderPage();

    expect(await screen.findByText(/Troca de óleo/)).toBeInTheDocument();
    expect(await screen.findByText(/Fiat Uno/)).toBeInTheDocument();
    expect(await screen.findByText("Agendada")).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há manutenções", async () => {
    mockApi();
    renderPage();

    expect(await screen.findByText("Nenhuma manutenção agendada ainda.")).toBeInTheDocument();
  });

  it("mostra erro quando a listagem falha", async () => {
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/maintenances?limit=100") return Promise.reject(new Error("fail"));
      return Promise.resolve([]) as never;
    });
    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
