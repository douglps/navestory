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
    vi.mocked(apiClient).mockResolvedValueOnce(vehicle).mockResolvedValueOnce({
      ...vehicle,
      nickname: "Uninho",
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
    vi.mocked(apiClient).mockResolvedValueOnce(vehicle).mockResolvedValueOnce(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Remover veículo" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/vehicles"));
    expect(apiClient).toHaveBeenCalledWith("/vehicles/v1", { method: "DELETE" });
  });
});
