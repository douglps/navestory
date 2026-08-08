import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import VehicleDetailPage from "./page";

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

describe("VehicleDetailPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const vehicle = {
    id: "v1",
    plate: "ABC1234",
    make: "Fiat",
    model: "Uno",
    year: 2020,
    vehicle_type: "carro",
    fuel_type: null,
    odometer: null,
    nickname: null,
    color: null,
    ipva_due_date: null,
    renavam: null,
    chassi: null,
  };

  const health = { score: 100, flags: [] };

  /**
   * @spec SPEC-20260730-001 RF-19
   * A página agora dispara duas queries em paralelo (`GET /vehicles/:id` e
   * `GET /vehicles/:id/health`) — o mock responde por URL em vez de depender da ordem
   * de chamada, que não é garantida entre as duas.
   */
  function mockApiByUrl(handlers: Record<string, unknown>) {
    vi.mocked(apiClient).mockImplementation((url: string, options?: { method?: string }) => {
      const key = options?.method ? `${options.method} ${url}` : url;
      // eslint-disable-next-line security/detect-object-injection -- guardado por `in` acima, mock de teste
      if (key in handlers) return Promise.resolve(handlers[key]);
      // eslint-disable-next-line security/detect-object-injection -- guardado por `in` acima, mock de teste
      if (url in handlers) return Promise.resolve(handlers[url]);
      return Promise.reject(new Error(`unmocked call: ${key}`));
    });
  }

  function renderPage() {
    return render(
      <QueryProvider>
        <VehicleDetailPage params={Promise.resolve({ id: "v1" })} />
      </QueryProvider>,
    );
  }

  it("mostra 404 quando o veículo não é encontrado (CA-08)", async () => {
    vi.mocked(apiClient).mockRejectedValue(new Error("not found"));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Veículo não encontrado.");
  });

  it("atualiza campos parciais do veículo (RF-05, CA-07)", async () => {
    mockApiByUrl({
      "/vehicles/v1": vehicle,
      "/vehicles/v1/health": health,
      "PATCH /vehicles/v1": { ...vehicle, nickname: "Uninho" },
    });
    renderPage();

    fireEvent.change(await screen.findByLabelText("Apelido"), {
      target: { value: "Uninho" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/vehicles/v1",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
  });

  /**
   * @spec SPEC-20260807-003 RF-01
   */
  it("carrega todos os campos editáveis pré-preenchidos (RF-01)", async () => {
    mockApiByUrl({
      "/vehicles/v1": { ...vehicle, nickname: "Carango", color: "Azul" },
      "/vehicles/v1/health": health,
    });
    renderPage();

    expect(await screen.findByDisplayValue("Fiat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Uno")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2020")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Carango")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Azul")).toBeInTheDocument();
  });

  /**
   * @spec SPEC-20260807-003 RF-06, RF-07, S17
   * Substitui o antigo `window.confirm` — a exclusão agora exige digitar a placa no
   * AlertDialog e o botão de confirmação permanece desabilitado até o valor bater.
   */
  it("mantém o botão de exclusão desabilitado até a placa digitada corresponder (RF-06)", async () => {
    const user = userEvent.setup();
    mockApiByUrl({
      "/vehicles/v1": vehicle,
      "/vehicles/v1/health": health,
    });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Remover veículo" }));
    const confirmButton = await screen.findByRole("button", {
      name: "Excluir definitivamente",
    });
    expect(confirmButton).toBeDisabled();

    const confirmationInput = screen.getByPlaceholderText("Digite ABC1234 para confirmar");
    await user.type(confirmationInput, "XYZ9999");
    expect(confirmButton).toBeDisabled();
  });

  it("remove o veículo após digitar a placa correta e redireciona (RF-06, RF-07, CA-05)", async () => {
    const user = userEvent.setup();
    mockApiByUrl({
      "/vehicles/v1": vehicle,
      "/vehicles/v1/health": health,
      "DELETE /vehicles/v1": undefined,
    });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Remover veículo" }));
    const confirmationInput = await screen.findByPlaceholderText(
      "Digite ABC1234 para confirmar",
    );
    await user.type(confirmationInput, "ABC1234");

    const confirmButton = screen.getByRole("button", { name: "Excluir definitivamente" });
    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/vehicles"));
    expect(apiClient).toHaveBeenCalledWith("/vehicles/v1", {
      method: "DELETE",
      body: { confirmationPlate: "ABC1234" },
    });
  });

  it("exibe a seção de saúde com score e flags em linguagem humana (RF-17, CA-03)", async () => {
    mockApiByUrl({
      "/vehicles/v1": vehicle,
      "/vehicles/v1/health": {
        score: 62,
        flags: [{ type: "fines_pending", count: 1 }],
      },
    });
    renderPage();

    expect(await screen.findByText("1 multa(s) pendente(s)")).toBeInTheDocument();
  });

  it("exibe 'Nenhum problema identificado' quando flags está vazio (RF-18, CA-04)", async () => {
    mockApiByUrl({ "/vehicles/v1": vehicle, "/vehicles/v1/health": health });
    renderPage();

    expect(await screen.findByText("Nenhum problema identificado.")).toBeInTheDocument();
  });
});
