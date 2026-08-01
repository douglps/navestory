import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  beforeEach(() => {
    pushMock.mockClear();
  });

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
    await userEvent.click(screen.getByLabelText("Mudar status"));

    expect(screen.getByRole("option", { name: "Manter status atual" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Em andamento" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Concluída" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Cancelada" })).toBeInTheDocument();
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
    await userEvent.click(screen.getByLabelText("Mudar status"));
    await userEvent.click(screen.getByRole("option", { name: "Em andamento" }));
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

  it("exibe erro da API quando o PATCH falha (onError)", async () => {
    const { ApiError: RealApiError } = await import("@/lib/http/api-client");
    vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === "PATCH") {
        return Promise.reject(new RealApiError("Conflito de dados", 409)) as never;
      }
      return Promise.resolve(maintenance) as never;
    });
    renderPage();

    await screen.findByDisplayValue("Troca de óleo");
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Conflito de dados"),
    );
  });

  it("exibe 'Manutenção não encontrada' quando a query falha", async () => {
    vi.mocked(apiClient).mockImplementation(() => Promise.reject(new Error("not found")) as never);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Manutenção não encontrada.");
  });

  it("SPEC-20260619-001 R-FORM-05: cancelar exibe window.confirm e não navega se recusado", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    mockApi();
    renderPage();

    await screen.findByDisplayValue("Troca de óleo");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("SPEC-20260619-001 R-FORM-05: cancelar navega para /maintenance quando confirm é aceito", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    mockApi();
    renderPage();

    await screen.findByDisplayValue("Troca de óleo");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(pushMock).toHaveBeenCalledWith("/maintenance");
    confirmSpy.mockRestore();
  });

  it("exibe completion_date quando preenchida na manutenção", async () => {
    mockApi({
      maintenance: {
        ...maintenance,
        status: "completed",
        completion_date: "2026-07-15T10:00:00.000Z",
      },
    });
    renderPage();

    await screen.findByDisplayValue("Troca de óleo");
    // O campo de data de conclusão deve estar preenchido
    const completionField = screen.getByLabelText("Data e hora de conclusão");
    expect((completionField as HTMLInputElement).value).not.toBe("");
  });

  it("SPEC-20260715-001 RF-17: status concluído mostra o status no formulário", async () => {
    mockApi({ maintenance: { ...maintenance, status: "completed", completion_date: "2026-08-10T10:00:00Z" } });
    renderPage();

    await screen.findByText("Concluída");
    // Manutenção concluída não tem seletor de status (terminal)
    expect(screen.queryByLabelText("Mudar status")).not.toBeInTheDocument();
  });
});
