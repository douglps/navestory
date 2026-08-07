import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UpcomingCostItem } from "@navestory/validators";
import { QueryProvider } from "@/lib/query/providers";
import { UpcomingCostsWidget } from "./UpcomingCostsWidget";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

function item(overrides: Partial<UpcomingCostItem>): UpcomingCostItem {
  return {
    source_type: "maintenance",
    source_id: "m1",
    title: "Troca de óleo",
    amount: 250,
    due_date: new Date().toISOString().slice(0, 10),
    vehicle_id: "v1",
    vehicle_plate: "ABC1234",
    is_estimated: false,
    ...overrides,
  };
}

function isoInDays(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function mockApi(items: UpcomingCostItem[]) {
  vi.mocked(apiClient).mockImplementation((path: string) => {
    if (path.startsWith("/expenses/upcoming"))
      return Promise.resolve(items) as never;
    return Promise.reject(new Error(`unmocked path: ${path}`));
  });
}

function renderWidget() {
  return render(
    <QueryProvider>
      <UpcomingCostsWidget />
    </QueryProvider>,
  );
}

describe("UpcomingCostsWidget", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("SPEC-20260721-002 US-09: busca com horizon_days=7 e limit=10 (P6)", async () => {
    mockApi([]);
    renderWidget();

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        "/expenses/upcoming?horizon_days=7&limit=10",
      );
    });
  });

  it("US-09: exibe empty state quando não há compromissos", async () => {
    mockApi([]);
    renderWidget();

    expect(
      await screen.findByText("Nenhum compromisso nos próximos 7 dias."),
    ).toBeInTheDocument();
  });

  it("US-09: exibe título, veículo e valor total agregado", async () => {
    mockApi([
      item({ due_date: isoInDays(1), amount: 100 }),
      item({ source_id: "m2", due_date: isoInDays(4), amount: 50 }),
    ]);
    renderWidget();

    expect(
      (await screen.findAllByText(/Troca de óleo/)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("R$ 150,00")).toBeInTheDocument();
  });

  it("SPEC-20260804-006 RF-09: o fundo do item permanece neutro independente da urgência", async () => {
    mockApi([item({ due_date: isoInDays(1) })]);
    renderWidget();

    const listItem = (await screen.findByText(/Troca de óleo/)).closest("li");
    expect(listItem).toHaveClass("bg-muted/40");
    expect(listItem).not.toHaveClass("bg-danger-pastel");
  });

  it("US-09, RF-09: evento a ≤2 dias recebe chip de urgência danger isolado", async () => {
    mockApi([item({ due_date: isoInDays(1) })]);
    renderWidget();

    const chip = await screen.findByText("Em 1d");
    expect(chip).toHaveClass("border-danger");
  });

  it("US-09, RF-09: evento a 3-5 dias recebe chip de urgência warning isolado", async () => {
    mockApi([item({ due_date: isoInDays(4) })]);
    renderWidget();

    const chip = await screen.findByText("Em 4d");
    expect(chip).toHaveClass("border-warning");
  });

  it("US-09, RF-09: evento a 6-7 dias recebe chip neutro", async () => {
    mockApi([item({ due_date: isoInDays(7) })]);
    renderWidget();

    const chip = await screen.findByText("Em 7d");
    expect(chip).toHaveClass("border-muted");
  });

  it("SPEC-20260804-006 RF-10: valor estimado exibe '(aprox.)' por extenso, não o prefixo '~'", async () => {
    mockApi([item({ due_date: isoInDays(1), amount: 450, is_estimated: true })]);
    renderWidget();

    expect(await screen.findByText("R$ 450,00 (aprox.)")).toBeInTheDocument();
    expect(screen.queryByText(/~R\$/)).not.toBeInTheDocument();
  });

  it("US-09, P6: exibe link 'Ver todos' quando atinge o teto de 10 itens", async () => {
    mockApi(
      Array.from({ length: 10 }, (_, i) =>
        item({ source_id: `m${i}`, due_date: isoInDays(i % 7) }),
      ),
    );
    renderWidget();

    const link = await screen.findByRole("link", { name: "Ver todos" });
    expect(link).toHaveAttribute("href", "/expenses?tab=proximas");
  });

  it("não exibe link 'Ver todos' quando há menos de 10 itens", async () => {
    mockApi([item({ due_date: isoInDays(1) })]);
    renderWidget();

    await screen.findByText(/Troca de óleo/);
    expect(
      screen.queryByRole("link", { name: "Ver todos" }),
    ).not.toBeInTheDocument();
  });
});
