import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import MaintenanceDetailPage from "./page";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

const maintenance = {
  id: "m1",
  vehicle_id: "v1",
  description: "Troca de óleo",
  status: "scheduled" as const,
  scheduled_date: "2026-08-01",
  completion_date: null,
  cost: null,
  odometer_km: null,
};

function mockApi(overrides: Record<string, unknown> = {}) {
  vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
    if (path === "/maintenances/m1" && (!options || options.method === undefined)) {
      return Promise.resolve(overrides.maintenance ?? maintenance) as never;
    }
    if (path === "/maintenances/m1" && options?.method === "PATCH") {
      return Promise.resolve(overrides.updateResult ?? maintenance) as never;
    }
    return Promise.reject(new Error(`unexpected call: ${path}`));
  });
}

describe("MaintenanceDetailPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <MaintenanceDetailPage params={Promise.resolve({ id: "m1" })} />
      </QueryProvider>,
    );
  }

  it("carrega os dados da manutenção e exibe o status atual (RF-17)", async () => {
    mockApi();
    renderPage();

    expect(await screen.findByDisplayValue("Troca de óleo")).toBeInTheDocument();
    expect(await screen.findByText("Agendada")).toBeInTheDocument();
  });

  it("exibe apenas transições válidas a partir do status atual (RF-17, R7)", async () => {
    mockApi();
    renderPage();

    await screen.findByDisplayValue("Troca de óleo");
    const select = screen.getByLabelText("Mudar status") as HTMLSelectElement;
    const options = Array.from(select.options).map((option) => option.value);

    expect(options).toEqual(["", "in_progress", "completed", "cancelled"]);
  });

  it("não exibe seletor de status quando o estado é terminal", async () => {
    mockApi({ maintenance: { ...maintenance, status: "completed" } });
    renderPage();

    await screen.findByDisplayValue("Troca de óleo");
    expect(screen.queryByLabelText("Mudar status")).not.toBeInTheDocument();
  });

  it("envia a transição de status escolhida e redireciona (RF-07)", async () => {
    mockApi();
    renderPage();

    await screen.findByDisplayValue("Troca de óleo");
    fireEvent.change(screen.getByLabelText("Mudar status"), {
      target: { value: "in_progress" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/maintenance"));
    expect(apiClient).toHaveBeenCalledWith(
      "/maintenances/m1",
      expect.objectContaining({
        method: "PATCH",
        body: expect.objectContaining({ status: "in_progress" }),
      }),
    );
  });
});
