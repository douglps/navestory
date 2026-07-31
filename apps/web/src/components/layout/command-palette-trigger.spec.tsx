import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandPaletteTrigger } from "./command-palette-trigger";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const VEHICLES = [
  { id: "v1", plate: "ABC1234", make: "Toyota", model: "Hilux", nickname: null },
];
const EXPENSES = [{ id: "e1", category: "Combustível", amount: 200, occurred_at: "2026-07-01" }];
const MAINTENANCES = [
  { id: "m1", description: "Troca de óleo", scheduled_date: "2026-07-10" },
];
const FINES = [{ id: "f1", description: "Excesso de velocidade", occurred_at: "2026-06-15" }];

function renderTrigger(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CommandPaletteTrigger />
    </QueryClientProvider> as ReactNode,
  );
}

describe("CommandPaletteTrigger", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        const path = url.replace("/api/backend", "");
        const data =
          path === "/vehicles"
            ? VEHICLES
            : path === "/expenses"
              ? EXPENSES
              : path === "/maintenances?limit=100"
                ? MAINTENANCES
                : path === "/fines"
                  ? FINES
                  : [];
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data }),
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("RNF-03: não monta o CommandPalette antes da primeira abertura", () => {
    renderTrigger();
    expect(screen.queryByPlaceholderText(/Buscar veículos/)).not.toBeInTheDocument();
  });

  it("abre a palette ao clicar no botão de busca", async () => {
    const user = userEvent.setup();
    renderTrigger();

    await user.click(screen.getByRole("button", { name: /Buscar/ }));

    expect(await screen.findByPlaceholderText(/Buscar veículos/)).toBeInTheDocument();
  });

  it("abre com Ctrl+K sem precisar clicar no botão", async () => {
    renderTrigger();

    await userEvent.keyboard("{Control>}k{/Control}");

    expect(await screen.findByPlaceholderText(/Buscar veículos/)).toBeInTheDocument();
  });

  it("RF-06: busca cruza veículos, despesas, manutenções e multas", async () => {
    const user = userEvent.setup();
    renderTrigger();
    await user.click(screen.getByRole("button", { name: /Buscar/ }));
    const input = await screen.findByPlaceholderText(/Buscar veículos/);

    await user.type(input, "ABC1234");
    await waitFor(() => expect(screen.getByText("ABC1234")).toBeInTheDocument());

    await user.clear(input);
    await user.type(input, "Combust");
    await waitFor(() => expect(screen.getByText("Combustível")).toBeInTheDocument());

    await user.clear(input);
    await user.type(input, "óleo");
    await waitFor(() => expect(screen.getByText("Troca de óleo")).toBeInTheDocument());

    await user.clear(input);
    await user.type(input, "excesso");
    await waitFor(() => expect(screen.getByText("Excesso de velocidade")).toBeInTheDocument());
  });

  it("multa selecionada navega para /fines/:id e fecha a palette", async () => {
    const user = userEvent.setup();
    renderTrigger();
    await user.click(screen.getByRole("button", { name: /Buscar/ }));
    await user.type(await screen.findByPlaceholderText(/Buscar veículos/), "excesso");

    await waitFor(() => expect(screen.getByText("Excesso de velocidade")).toBeInTheDocument());
    await user.click(screen.getByText("Excesso de velocidade"));

    expect(pushMock).toHaveBeenCalledWith("/fines/f1");
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/Buscar veículos/)).not.toBeInTheDocument(),
    );
  });

  it("query com menos de 2 caracteres não retorna itens", async () => {
    const user = userEvent.setup();
    renderTrigger();
    await user.click(screen.getByRole("button", { name: /Buscar/ }));

    await user.type(await screen.findByPlaceholderText(/Buscar veículos/), "a");
    expect(screen.getByText("Digite ao menos 2 caracteres")).toBeInTheDocument();
  });

  it('sem resultado exibe "Nenhum resultado para X"', async () => {
    const user = userEvent.setup();
    renderTrigger();
    await user.click(screen.getByRole("button", { name: /Buscar/ }));

    await user.type(await screen.findByPlaceholderText(/Buscar veículos/), "zzzzz");

    await waitFor(() =>
      expect(screen.getByText('Nenhum resultado para "zzzzz"')).toBeInTheDocument(),
    );
  });
});
