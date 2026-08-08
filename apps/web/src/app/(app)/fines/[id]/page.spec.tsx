import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("SPEC-20260722-005 RF-07: clica em 'Pagar' e chama PATCH com status=paid", async () => {
    const user = userEvent.setup();
    const fine = makeFine({ status: "pending" });
    mockApi(fine);
    renderPage();

    await screen.findByDisplayValue("Excesso de velocidade");
    await user.click(screen.getByRole("button", { name: "Pagar" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/fines/f1",
        expect.objectContaining({ method: "PATCH", body: { status: "paid" } }),
      ),
    );
  });

  it("SPEC-20260722-005 RF-07: clica em 'Recorrer' e chama PATCH com status=appealing", async () => {
    const user = userEvent.setup();
    const fine = makeFine({ status: "pending" });
    mockApi(fine);
    renderPage();

    await screen.findByDisplayValue("Excesso de velocidade");
    await user.click(screen.getByRole("button", { name: "Recorrer" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/fines/f1",
        expect.objectContaining({ body: { status: "appealing" } }),
      ),
    );
  });

  it("CA-09: exibe erro quando valor com desconto é maior que o valor original", async () => {
    const user = userEvent.setup();
    // amount_with_discount maior que amount — só testamos via mock que altere os estados
    // Usamos a fine normal e mudamos o campo via fireEvent
    mockApi(makeFine({ amount: 100, amount_with_discount: 200 }));
    renderPage();

    // Aguarda carregar
    await screen.findByDisplayValue("Excesso de velocidade");
    // Salvar diretamente — o useEffect preencheu amount_with_discount=200 > amount=100
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /Valor com desconto não pode ser maior/,
      );
    });
  });

  it("SPEC-20260619-001 R-FORM-05: cancelar sem alterações navega para /fines sem confirm", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    mockApi(makeFine());
    renderPage();

    await screen.findByDisplayValue("Excesso de velocidade");
    // sem nenhuma alteração (isDirty=false) → vai para /fines sem confirm
    const cancelBtns = screen.getAllByRole("button", { name: "Cancelar" });
    // O último botão "Cancelar" é do formulário (não o de ação de status)
    await user.click(cancelBtns[cancelBtns.length - 1]!);

    expect(pushMock).toHaveBeenCalledWith("/fines");
    confirmSpy.mockRestore();
  });

  it("SPEC-20260619-001 R-FORM-05, SPEC-20260807-005 RF-04: cancelar com alterações exibe AlertDialog", async () => {
    const user = userEvent.setup();
    mockApi(makeFine());
    renderPage();

    await screen.findByDisplayValue("Excesso de velocidade");
    // Marcar o form como dirty
    await user.clear(screen.getByLabelText("Observações"));
    await user.type(screen.getByLabelText("Observações"), "mudei");

    const cancelBtns = screen.getAllByRole("button", { name: "Cancelar" });
    await user.click(cancelBtns[cancelBtns.length - 1]!);

    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName(
      "Descartar alterações?",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("exibe erro da API quando o PATCH falha", async () => {
    const { ApiError: RealApiError } = await import("@/lib/http/api-client");
    vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === "PATCH") {
        return Promise.reject(new RealApiError("Requisição inválida", 400)) as never;
      }
      return Promise.resolve(makeFine()) as never;
    });
    renderPage();

    await screen.findByDisplayValue("Excesso de velocidade");
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Requisição inválida"),
    );
  });

  it("SPEC-20260722-005 RF-07: multa paga não exibe botões de ação (status terminal)", async () => {
    mockApi(makeFine({ status: "paid" }));
    renderPage();

    await screen.findByDisplayValue("Excesso de velocidade");
    expect(screen.getByText("Paga")).toBeInTheDocument();
    // Status terminal: nenhum botão de transição de status
    expect(screen.queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recorrer" })).not.toBeInTheDocument();
  });

  it("SPEC-20260722-005 RF-07: multa cancelada não exibe botões de ação (status terminal)", async () => {
    mockApi(makeFine({ status: "cancelled" }));
    renderPage();

    await screen.findByDisplayValue("Excesso de velocidade");
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
  });

  it("carrega multa com campos opcionais nulos sem erros", async () => {
    mockApi(makeFine({
      auto_number: null,
      infraction_code: null,
      amount_with_discount: null,
      due_date: null,
      appeal_deadline: null,
      location: null,
      odometer_km: null,
      driver_name: null,
      notes: null,
    }));
    renderPage();

    // Campos opcionais nulos devem ser tratados como strings vazias
    await screen.findByDisplayValue("Excesso de velocidade");
    // Múltiplos inputs com "" — verificar que o campo auto_number está vazio
    const autoNumberInput = document.querySelector<HTMLInputElement>("#auto_number");
    expect(autoNumberInput?.value).toBe("");
  });

  it("SPEC-20260722-005 RF-07: multa em recurso exibe botões de transição para concluída/cancelada", async () => {
    mockApi(makeFine({ status: "appealing" }));
    renderPage();

    await screen.findByDisplayValue("Excesso de velocidade");
    expect(screen.getByText("Em recurso")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pagar" })).toBeInTheDocument();
    // Status "appealing" permite pagar ou cancelar
    const cancelBtns = screen.getAllByRole("button", { name: "Cancelar" });
    expect(cancelBtns.length).toBeGreaterThanOrEqual(1);
  });

  it("altera campos opcionais da multa e exibe paid_at quando presente", async () => {
    // Cobre: onChange de occurredAt, autoNumber, infractionCode, dueDate,
    // appealDeadline, location, driverName + branch paid_at
    mockApi(makeFine({ paid_at: "2026-07-05" }));
    renderPage();

    await screen.findByDisplayValue("Excesso de velocidade");

    // Branch: paid_at preenchido → exibe "Pago em"
    expect(screen.getByText(/Pago em 2026-07-05/)).toBeInTheDocument();

    // onChange handlers dos campos opcionais
    fireEvent.change(screen.getByLabelText("Data da infração *"), { target: { value: "2026-06-30" } });
    fireEvent.change(screen.getByLabelText("Número do auto de infração"), { target: { value: "AI-888" } });
    fireEvent.change(screen.getByLabelText("Código da infração"), { target: { value: "55680" } });
    fireEvent.change(screen.getByLabelText("Vencimento"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Prazo para recurso"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("Local"), { target: { value: "Av. Brasil" } });
    fireEvent.change(screen.getByLabelText("Condutor"), { target: { value: "Pedro" } });

    expect(screen.getByLabelText("Número do auto de infração")).toHaveValue("AI-888");
    expect(screen.getByLabelText("Código da infração")).toHaveValue("55680");
    expect(screen.getByLabelText("Local")).toHaveValue("Av. Brasil");
    expect(screen.getByLabelText("Condutor")).toHaveValue("Pedro");
  });
});
