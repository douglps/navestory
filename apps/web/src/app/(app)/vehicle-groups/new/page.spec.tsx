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
});
