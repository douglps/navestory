import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
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

  it("exibe custo quando cost não é null", async () => {
    mockApi({
      maintenances: [
        {
          id: "m1",
          vehicle_id: "v1",
          description: "Revisão completa",
          status: "completed",
          scheduled_date: "2026-07-01",
          cost: 350.0,
        },
      ],
      vehicles: [{ id: "v1", plate: "XYZ5678", make: null, model: null, nickname: null }],
    });
    renderPage();

    await screen.findByText(/Revisão completa/);
    expect(screen.getByText(/350/)).toBeInTheDocument();
  });

  it("exibe badge 'Concluída' para status completed", async () => {
    mockApi({
      maintenances: [
        {
          id: "m1",
          vehicle_id: "v1",
          description: "Revisão",
          status: "completed",
          scheduled_date: "2026-07-01",
          cost: null,
        },
      ],
      vehicles: [{ id: "v1", plate: "ABC1234", make: "Ford", model: "Ka", nickname: null }],
    });
    renderPage();

    expect(await screen.findByText("Concluída")).toBeInTheDocument();
  });

  it("exibe badge 'Em andamento' para status in_progress", async () => {
    mockApi({
      maintenances: [
        {
          id: "m1",
          vehicle_id: "v1",
          description: "Alinhamento",
          status: "in_progress",
          scheduled_date: "2026-07-01",
          cost: null,
        },
      ],
      vehicles: [{ id: "v1", plate: "ABC1234", make: "Ford", model: "Ka", nickname: null }],
    });
    renderPage();

    expect(await screen.findByText("Em andamento")).toBeInTheDocument();
  });

  it("exibe badge 'Cancelada' para status cancelled", async () => {
    mockApi({
      maintenances: [
        {
          id: "m1",
          vehicle_id: "v1",
          description: "Revisão cancelada",
          status: "cancelled",
          scheduled_date: "2026-07-01",
          cost: null,
        },
      ],
      vehicles: [{ id: "v1", plate: "ABC1234", make: "Ford", model: "Ka", nickname: null }],
    });
    renderPage();

    expect(await screen.findByText("Cancelada")).toBeInTheDocument();
  });

  it("vehicleLabel cai para placa quando make e model são null e sem nickname", async () => {
    mockApi({
      maintenances: [
        {
          id: "m1",
          vehicle_id: "v1",
          description: "Revisão",
          status: "scheduled",
          scheduled_date: "2026-07-01",
          cost: null,
        },
      ],
      vehicles: [{ id: "v1", plate: "QRS-9900", make: null, model: null, nickname: null }],
    });
    renderPage();

    await screen.findByText(/Revisão/);
    expect(screen.getByText("QRS-9900")).toBeInTheDocument();
  });

  it("vehicleLabel usa nickname quando disponível", async () => {
    mockApi({
      maintenances: [
        {
          id: "m1",
          vehicle_id: "v1",
          description: "Revisão",
          status: "scheduled",
          scheduled_date: "2026-07-01",
          cost: null,
        },
      ],
      vehicles: [{ id: "v1", plate: "ABC1234", make: "Toyota", model: "Hilux", nickname: "Caminhonete" }],
    });
    renderPage();

    await screen.findByText(/Revisão/);
    expect(screen.getByText("Caminhonete")).toBeInTheDocument();
  });

  it("RF-05: filtra por veículo ativo quando selectionMode é 'single'", async () => {
    // Configura o store para selecionar v1
    useDashboardStore.setState({ selectionMode: "single", activeVehicleId: "v1", activeGroupId: null });
    mockApi({
      maintenances: [
        { id: "m1", vehicle_id: "v1", description: "Revisão do v1", status: "scheduled", scheduled_date: "2026-07-01", cost: null },
        { id: "m2", vehicle_id: "v2", description: "Revisão do v2", status: "scheduled", scheduled_date: "2026-07-01", cost: null },
      ],
      vehicles: [
        { id: "v1", plate: "AAA1111", make: "Honda", model: "Civic", nickname: null },
        { id: "v2", plate: "BBB2222", make: "Toyota", model: "Corolla", nickname: null },
      ],
    });
    renderPage();

    await screen.findByText(/Revisão do v1/);
    expect(screen.queryByText(/Revisão do v2/)).not.toBeInTheDocument();

    // Restaura estado padrão
    useDashboardStore.setState({ selectionMode: "fleet", activeVehicleId: null, activeGroupId: null });
  });
});
