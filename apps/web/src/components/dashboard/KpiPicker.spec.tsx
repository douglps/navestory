import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KpiCatalogId } from "@navestory/validators";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";
import { KpiPicker } from "./KpiPicker";

const DEFAULT_ACTIVE: KpiCatalogId[] = [
  "expenses_month",
  "urgent_maintenance",
  "cost_per_km",
  "next_maintenance",
];

function renderPicker(activeIds: KpiCatalogId[] = DEFAULT_ACTIVE) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <KpiPicker activeIds={activeIds} />
    </QueryClientProvider> as ReactNode,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("KpiPicker", () => {
  it("SPEC-20260721-002 RF-01: renderiza o botão 'Personalizar KPIs'", () => {
    renderPicker();

    expect(screen.getByRole("button", { name: "Personalizar KPIs" })).toBeInTheDocument();
  });

  it("abre o diálogo ao clicar no botão 'Personalizar KPIs'", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: "Personalizar KPIs" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("SPEC-20260721-002 R-KPI-01: exibe todos os KPIs do catálogo como checkboxes", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: "Personalizar KPIs" }));

    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThanOrEqual(4);
    });
  });

  it("inicializa o estado de seleção a partir dos activeIds passados", async () => {
    const user = userEvent.setup();
    renderPicker(["expenses_month", "urgent_maintenance"]);

    await user.click(screen.getByRole("button", { name: "Personalizar KPIs" }));

    await waitFor(() => {
      const checkedBoxes = screen.getAllByRole("checkbox", { checked: true });
      expect(checkedBoxes.length).toBe(2);
    });
  });

  it("SPEC-20260721-002 RF-01: toggle adiciona KPI à seleção quando marcado", async () => {
    const user = userEvent.setup();
    renderPicker([]);

    await user.click(screen.getByRole("button", { name: "Personalizar KPIs" }));

    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    const firstCheckbox = screen.getAllByRole("checkbox")[0]!;
    await user.click(firstCheckbox);

    const checkedBoxes = screen.getAllByRole("checkbox", { checked: true });
    expect(checkedBoxes.length).toBe(1);
  });

  it("toggle remove KPI da seleção quando desmarcado", async () => {
    const user = userEvent.setup();
    renderPicker(["expenses_month"]);

    await user.click(screen.getByRole("button", { name: "Personalizar KPIs" }));

    await waitFor(() => {
      const checkedBoxes = screen.getAllByRole("checkbox", { checked: true });
      expect(checkedBoxes.length).toBe(1);
    });

    const checkedCheckbox = screen.getAllByRole("checkbox", { checked: true })[0]!;
    await user.click(checkedCheckbox);

    const checkedBoxesAfter = screen.queryAllByRole("checkbox", { checked: true });
    expect(checkedBoxesAfter.length).toBe(0);
  });

  it("SPEC-20260721-002 RF-01: salvar chama PATCH /preferences com os KPIs selecionados", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient).mockResolvedValue({ dashboard_kpi_ids: DEFAULT_ACTIVE });
    renderPicker(DEFAULT_ACTIVE);

    await user.click(screen.getByRole("button", { name: "Personalizar KPIs" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        "/preferences",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  it("fecha o diálogo após salvar com sucesso", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient).mockResolvedValue({ dashboard_kpi_ids: DEFAULT_ACTIVE });
    renderPicker(DEFAULT_ACTIVE);

    await user.click(screen.getByRole("button", { name: "Personalizar KPIs" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("exibe erro quando a seleção está vazia (abaixo do mínimo)", async () => {
    const user = userEvent.setup();
    renderPicker([]);

    await user.click(screen.getByRole("button", { name: "Personalizar KPIs" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(apiClient).not.toHaveBeenCalled();
  });

  it("exibe alerta de erro da API quando mutation falha", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient).mockRejectedValue(new Error("Falha na API"));
    renderPicker(DEFAULT_ACTIVE);

    await user.click(screen.getByRole("button", { name: "Personalizar KPIs" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(screen.getByText(/Não foi possível salvar/)).toBeInTheDocument();
    });
  });

  it("cancela o diálogo sem salvar ao clicar em 'Cancelar'", async () => {
    const user = userEvent.setup();
    renderPicker(DEFAULT_ACTIVE);

    await user.click(screen.getByRole("button", { name: "Personalizar KPIs" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(apiClient).not.toHaveBeenCalled();
  });

  it("redefine o estado ao reabrir o diálogo", async () => {
    const user = userEvent.setup();
    renderPicker(["expenses_month"]);

    await user.click(screen.getByRole("button", { name: "Personalizar KPIs" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const firstUnChecked = screen.getAllByRole("checkbox", { checked: false })[0]!;
    await user.click(firstUnChecked);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Personalizar KPIs" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const checkedBoxes = screen.getAllByRole("checkbox", { checked: true });
    expect(checkedBoxes.length).toBe(1);
  });
});
