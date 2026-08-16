import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import VehicleGroupDetailPage from "./page";

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

describe("VehicleGroupDetailPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const group = { id: "g1", name: "Motos", color: "#ef4444", vehicleIds: ["v1"] };
  const vehicles = [
    { id: "v1", make: "Honda", model: "CG 160", plate: "ABC1234" },
    { id: "v2", make: "Yamaha", model: "Fazer", plate: "XYZ5678" },
  ];

  function mockApi(overrides?: { group?: typeof group; vehicles?: typeof vehicles }) {
    vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/vehicle-groups" && (!options || options.method === undefined)) {
        return Promise.resolve([overrides?.group ?? group]);
      }
      if (path === "/vehicles") {
        return Promise.resolve(overrides?.vehicles ?? vehicles);
      }
      return Promise.resolve(undefined);
    });
  }

  function renderPage() {
    return render(
      <QueryProvider>
        <VehicleGroupDetailPage params={Promise.resolve({ id: "g1" })} />
      </QueryProvider>,
    );
  }

  it("mostra 404 quando o grupo não é encontrado (CA-08)", async () => {
    vi.mocked(apiClient).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Grupo não encontrado.");
  });

  it("atualiza nome do grupo (RF-03, CA-08)", async () => {
    mockApi();
    renderPage();

    fireEvent.change(await screen.findByLabelText("Nome"), { target: { value: "Frota SP" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/vehicle-groups/g1",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
  });

  /**
   * @spec SPEC-20260807-005 RF-09
   */
  it("remove o grupo após confirmação via AlertDialog e redireciona (RF-04, CA-07)", async () => {
    mockApi();
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Remover grupo" }));
    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName(
      "Remover este grupo?",
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/vehicle-groups"));
    expect(apiClient).toHaveBeenCalledWith("/vehicle-groups/g1", { method: "DELETE" });
  });

  it("inicializa os checkboxes com os membros atuais do grupo (SPEC-20260804-005 RF-02, CA-01)", async () => {
    mockApi();
    renderPage();

    const honda = await screen.findByRole("checkbox", { name: /Honda CG 160/ });
    const yamaha = screen.getByRole("checkbox", { name: /Yamaha Fazer/ });

    expect(honda).toBeChecked();
    expect(yamaha).not.toBeChecked();
  });

  /**
   * @spec SPEC-20260807-005 RF-08
   */
  it("sem alterar a seleção, exibe diff zerado via AlertDialog e envia o payload atual (SPEC-20260804-005 RF-04, CA-03, CA-04)", async () => {
    mockApi();
    renderPage();

    const honda = await screen.findByRole("checkbox", { name: /Honda CG 160/ });
    await waitFor(() => expect(honda).toBeChecked());
    fireEvent.click(screen.getByRole("button", { name: "Salvar membros" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveAccessibleName("Salvar alterações nos membros?");
    expect(dialog).toHaveAccessibleDescription("Nenhuma alteração nos membros.");
    fireEvent.click(screen.getByRole("button", { name: "Aplicar alterações" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/vehicle-groups/g1/members",
        expect.objectContaining({ method: "PUT", body: { vehicleIds: ["v1"] } }),
      ),
    );
  });

  /**
   * @spec SPEC-20260807-005 RF-07
   */
  it("desmarcar todos os membros de um grupo populado exige confirmação de remoção total via AlertDialog (SPEC-20260804-005 RF-05, CA-05)", async () => {
    mockApi();
    renderPage();

    const honda = await screen.findByRole("checkbox", { name: /Honda CG 160/ });
    await waitFor(() => expect(honda).toBeChecked());
    fireEvent.click(honda);
    fireEvent.click(screen.getByRole("button", { name: "Salvar membros" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveAccessibleName("Remover todos os membros?");
    expect(dialog).toHaveAccessibleDescription(
      "Isso removerá o único veículo deste grupo.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/vehicle-groups/g1/members",
        expect.objectContaining({ method: "PUT", body: { vehicleIds: [] } }),
      ),
    );
  });

  it("cancelar o AlertDialog não dispara a requisição de salvar membros (SPEC-20260804-005 RF-06, CA-06)", async () => {
    mockApi();
    renderPage();

    await screen.findByRole("checkbox", { name: /Honda CG 160/ });
    fireEvent.click(screen.getByRole("button", { name: "Salvar membros" }));

    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(apiClient).not.toHaveBeenCalledWith(
      "/vehicle-groups/g1/members",
      expect.anything(),
    );
  });
});
