import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import VehicleOdometerPage from "./page";

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

/** Digita dígito por dígito num OdometerInput (estilo caixa eletrônico). */
function typeDigits(input: HTMLElement, digits: string): void {
  for (const digit of digits) {
    fireEvent.keyDown(input, { key: digit });
  }
}

describe("VehicleOdometerPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const vehicle = {
    id: "v1",
    plate: "ABC1234",
    make: "Fiat",
    model: "Uno",
    nickname: null,
    odometer: 40_000,
  };

  function renderPage() {
    return render(
      <QueryProvider>
        <VehicleOdometerPage params={Promise.resolve({ id: "v1" })} />
      </QueryProvider>,
    );
  }

  it("SPEC-20260531-001 RF-DC-02: carrega o odômetro atual e envia PATCH ao salvar", async () => {
    vi.mocked(apiClient).mockResolvedValueOnce(vehicle).mockResolvedValueOnce({
      ...vehicle,
      odometer: 40_500,
    });
    renderPage();

    expect(await screen.findByText(/Fiat Uno/)).toBeInTheDocument();

    const input = screen.getByLabelText("Quilometragem atual *");
    typeDigits(input, "40500");
    fireEvent.click(screen.getByRole("button", { name: "Atualizar quilometragem" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/vehicles/v1",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("Cancelar volta ao dashboard sem salvar", async () => {
    vi.mocked(apiClient).mockResolvedValueOnce(vehicle);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

    expect(pushMock).toHaveBeenCalledWith("/dashboard");
    expect(apiClient).not.toHaveBeenCalledWith(
      "/vehicles/v1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
