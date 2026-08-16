import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import NewVehicleGroupPage from "./page";

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

describe("NewVehicleGroupPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <NewVehicleGroupPage />
      </QueryProvider>,
    );
  }

  it("mostra erro de validação client-side com nome acima do limite (CA-02)", async () => {
    vi.mocked(apiClient).mockResolvedValue([]);
    renderPage();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "a".repeat(61) } });
    fireEvent.click(screen.getByRole("button", { name: "Criar grupo" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(apiClient).not.toHaveBeenCalledWith(
      "/vehicle-groups",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("cria o grupo e redireciona para /vehicle-groups (RF-01, CA-01)", async () => {
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/vehicles") return Promise.resolve([]);
      if (path === "/vehicle-groups") return Promise.resolve({ id: "g1" });
      return Promise.resolve(undefined);
    });
    renderPage();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Motos" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar grupo" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/vehicle-groups"));
    expect(apiClient).toHaveBeenCalledWith(
      "/vehicle-groups",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({ name: "Motos" }),
      }),
    );
  });

  it("adiciona e remove veículo da seleção (toggleVehicle)", async () => {
    const VEHICLE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/vehicles") {
        return Promise.resolve([{ id: VEHICLE_ID, plate: "XYZ9876", make: "Honda", model: "CG" }]);
      }
      if (path === "/vehicle-groups") return Promise.resolve({ id: "g1" });
      return Promise.resolve(undefined);
    });
    renderPage();

    const checkbox = await screen.findByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox); // toggleVehicle → adiciona
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox); // toggleVehicle → remove
    expect(checkbox).not.toBeChecked();
  });

  it("altera a cor via input de texto e via botão preset (setColor handlers)", async () => {
    vi.mocked(apiClient).mockResolvedValue([]);
    renderPage();

    // Cobre onChange do input de cor
    const colorInput = screen.getByLabelText("Cor");
    fireEvent.change(colorInput, { target: { value: "#ff0000" } });
    expect(colorInput).toHaveValue("#ff0000");

    // Cobre onClick do botão de preset de cor (primeiro preset disponível)
    const { PRESET_GROUP_COLORS } = await import("@navestory/validators");
    const secondPreset = PRESET_GROUP_COLORS[1];
    fireEvent.click(screen.getByRole("button", { name: "Vermelho" }));

    // Após clicar, o input deve refletir o preset selecionado
    await waitFor(() => expect(colorInput).toHaveValue(secondPreset));
  });
});
