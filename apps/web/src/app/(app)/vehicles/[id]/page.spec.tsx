import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    nickname: null,
    color: null,
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

  it("remove o veículo após confirmação e redireciona (RF-06, CA-05)", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockApiByUrl({
      "/vehicles/v1": vehicle,
      "/vehicles/v1/health": health,
      "DELETE /vehicles/v1": undefined,
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Remover veículo" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/vehicles"));
    expect(apiClient).toHaveBeenCalledWith("/vehicles/v1", { method: "DELETE" });
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
