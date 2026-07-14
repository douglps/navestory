import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import NewExpensePage from "./page";

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

const VEHICLE_ID = "11111111-1111-4111-8111-111111111111";
const vehicles = [{ id: VEHICLE_ID, plate: "ABC1234", make: "Fiat", model: "Uno", nickname: null }];
const categories = { default: [{ value: "fuel", label: "Combustível" }], custom: [] };

function mockLookups() {
  vi.mocked(apiClient).mockImplementation((path: string) => {
    if (path === "/vehicles") return Promise.resolve(vehicles) as never;
    if (path === "/categories") return Promise.resolve(categories) as never;
    return Promise.resolve({ id: "e1" }) as never;
  });
}

describe("NewExpensePage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <NewExpensePage />
      </QueryProvider>,
    );
  }

  async function fillValidForm() {
    await screen.findByText("Fiat Uno");
    fireEvent.change(screen.getByLabelText("Veículo"), { target: { value: VEHICLE_ID } });
    fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "fuel" } });
    fireEvent.change(screen.getByLabelText("Valor (R$)"), { target: { value: "150.00" } });
    fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-07-14" } });
  }

  it("mostra erro de validação client-side com valor inválido (CA-02)", async () => {
    mockLookups();
    renderPage();

    await fillValidForm();
    fireEvent.change(screen.getByLabelText("Valor (R$)"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("registra a despesa e redireciona para /expenses (RF-01, CA-01)", async () => {
    mockLookups();
    renderPage();

    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/expenses"));
    expect(apiClient).toHaveBeenCalledWith(
      "/expenses",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({ vehicle_id: VEHICLE_ID, category: "fuel", amount: 150 }),
      }),
    );
  });
});
