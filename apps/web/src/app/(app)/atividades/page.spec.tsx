import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import AtividadesPage from "./page";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

const LOGS = [
  {
    id: "1",
    action: "VEHICLE_CREATED",
    table_name: "vehicles",
    record_id: "v1",
    changes: { plate: "ABC1234" },
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    action: "EXPENSE_UPDATED",
    table_name: "expenses",
    record_id: "e1",
    changes: { amount: 100 },
    created_at: new Date(Date.now() - 90 * 60_000).toISOString(),
  },
  {
    id: "3",
    action: "MAINTENANCE_DELETED",
    table_name: "maintenances",
    record_id: "m1",
    changes: {},
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
];

function renderPage() {
  return render(
    <QueryProvider>
      <AtividadesPage />
    </QueryProvider>,
  );
}

describe("AtividadesPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exibe os KPIs e a tabela de eventos (RF-11, RF-12)", async () => {
    vi.mocked(apiClient).mockResolvedValue(LOGS as never);

    renderPage();

    await waitFor(() => expect(screen.getByText("Total")).toBeInTheDocument());
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Criação de Veículo")).toBeInTheDocument();
    expect(screen.getByText("Atualização de Despesa")).toBeInTheDocument();
    expect(screen.getByText("Exclusão de Manutenção")).toBeInTheDocument();
  });

  it("exibe tempo relativo correto (RF-13)", async () => {
    vi.mocked(apiClient).mockResolvedValue(LOGS as never);

    renderPage();

    await waitFor(() => expect(screen.getByText("agora")).toBeInTheDocument());
    expect(screen.getByText("1h atrás")).toBeInTheDocument();
    expect(screen.getByText("2h atrás")).toBeInTheDocument();
  });

  it("exibe estado vazio quando não há entradas (RF-15)", async () => {
    vi.mocked(apiClient).mockResolvedValue([] as never);

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Nenhuma operação registrada ainda.")).toBeInTheDocument(),
    );
  });
});
