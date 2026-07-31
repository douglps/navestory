import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import FineDetailPage from "./page";

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

function makeFine(overrides: Record<string, unknown> = {}) {
  return {
    id: "f1",
    user_id: "u1",
    vehicle_id: "v1",
    description: "Excesso de velocidade",
    amount: 195.23,
    amount_with_discount: null,
    occurred_at: "2026-07-01",
    auto_number: "AI-123",
    infraction_code: "55170",
    due_date: "2026-08-01",
    paid_at: null,
    appeal_deadline: "2026-07-20",
    location: "Av. Paulista",
    odometer_km: 50000,
    driver_name: "João",
    status: "pending",
    notes: "observação",
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

function mockApi(fine: ReturnType<typeof makeFine>) {
  vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
    if (options?.method === "PATCH") return Promise.resolve({ ...fine, ...options }) as never;
    if (path === `/fines/${fine.id}`) return Promise.resolve(fine) as never;
    return Promise.reject(new Error(`unexpected path: ${path}`));
  });
}

describe("FineDetailPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage(id = "f1") {
    return render(
      <QueryProvider>
        <FineDetailPage params={Promise.resolve({ id })} />
      </QueryProvider>,
    );
  }

  it("exibe todos os campos da multa (CA-11)", async () => {
    mockApi(makeFine());
    renderPage();

    expect(await screen.findByDisplayValue("Excesso de velocidade")).toBeInTheDocument();
    expect(screen.getByDisplayValue("AI-123")).toBeInTheDocument();
    expect(screen.getByDisplayValue("55170")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Av. Paulista")).toBeInTheDocument();
    expect(screen.getByDisplayValue("João")).toBeInTheDocument();
    expect(screen.getByDisplayValue("observação")).toBeInTheDocument();
  });

  it("edita um campo e salva via PATCH sem redirect (CA-12, R-FORM-04)", async () => {
    mockApi(makeFine());
    renderPage();

    await screen.findByDisplayValue("Excesso de velocidade");
    fireEvent.change(screen.getByLabelText("Observações"), { target: { value: "nova nota" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/fines/f1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({ notes: "nova nota" }),
        }),
      ),
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("multa pendente exibe status 'Pendente' e as ações Pagar/Recorrer/Cancelar (CA-13)", async () => {
    mockApi(makeFine({ status: "pending" }));
    renderPage();

    await screen.findByDisplayValue("Excesso de velocidade");
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pagar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recorrer" })).toBeInTheDocument();
    // "Cancelar" aparece duas vezes: ação de status (pending → cancelled) e botão do formulário.
    expect(screen.getAllByRole("button", { name: "Cancelar" })).toHaveLength(2);
  });

  it("mostra erro quando a multa não é encontrada", async () => {
    vi.mocked(apiClient).mockImplementation(() => Promise.reject(new Error("404")) as never);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Multa não encontrada.");
  });
});
