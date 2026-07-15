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

  const group = { id: "g1", name: "Motos", color: "#ef4444" };

  function mockApi() {
    vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/vehicle-groups" && (!options || options.method === undefined)) {
        return Promise.resolve([group]);
      }
      if (path === "/vehicles") {
        return Promise.resolve([]);
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

  it("remove o grupo após confirmação e redireciona (RF-04, CA-07)", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockApi();
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Remover grupo" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/vehicle-groups"));
    expect(apiClient).toHaveBeenCalledWith("/vehicle-groups/g1", { method: "DELETE" });
  });
});
