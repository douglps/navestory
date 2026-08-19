import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import { SupplierCombobox } from "./supplier-combobox";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

// @spec SPEC-20260814-003 RF-01, RF-04, RF-05, RF-07, RF-10
function Controlled({ workspaceId }: { workspaceId?: string }) {
  const [value, setValue] = useState("");
  return (
    <SupplierCombobox
      value={value}
      onChange={setValue}
      workspaceId={workspaceId}
    />
  );
}

function renderCombobox(workspaceId?: string) {
  return render(
    <QueryProvider>
      <Controlled workspaceId={workspaceId} />
    </QueryProvider>,
  );
}

describe("SupplierCombobox", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("RF-01, US-01: exibe sugestões pessoais e seleciona ao clicar, preenchendo o campo", async () => {
    vi.mocked(apiClient).mockResolvedValue([
      { supplier: "Shell Centro", source: "personal" },
      { supplier: "Ipiranga BR", source: "personal" },
    ] as never);
    const user = userEvent.setup();
    renderCombobox();

    const input = screen.getByRole("combobox");
    await user.click(input);

    const option = await screen.findByRole("option", { name: "Shell Centro" });
    await user.click(option);

    expect(input).toHaveValue("Shell Centro");
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
    );
  });

  it("US-01: aceita valor digitado que não está nas sugestões (texto livre, R-FUEL-04)", async () => {
    vi.mocked(apiClient).mockResolvedValue([] as never);
    const user = userEvent.setup();
    renderCombobox();

    const input = screen.getByRole("combobox");
    await user.type(input, "Posto Novo Desconhecido");

    expect(input).toHaveValue("Posto Novo Desconhecido");
  });

  it("US-01: fecha a lista com Esc mantendo o texto digitado", async () => {
    vi.mocked(apiClient).mockResolvedValue([
      { supplier: "Shell Centro", source: "personal" },
    ] as never);
    const user = userEvent.setup();
    renderCombobox();

    const input = screen.getByRole("combobox");
    await user.click(input);
    await screen.findByRole("option", { name: "Shell Centro" });

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
    );
  });

  it("US-02, RF-03: sugestões de workspace aparecem em grupo separado com used_by_count", async () => {
    vi.mocked(apiClient).mockResolvedValue([
      { supplier: "Posto Pessoal", source: "personal" },
      {
        supplier: "Posto Frota",
        source: "workspace",
        used_by_count: 3,
        most_recent_user_name: "Ana",
      },
    ] as never);
    const user = userEvent.setup();
    renderCombobox("ws1");

    await user.click(screen.getByRole("combobox"));

    expect(
      await screen.findByText("Mais usado no workspace"),
    ).toBeInTheDocument();
    expect(screen.getByText("Seus postos recentes")).toBeInTheDocument();
    expect(screen.getByText(/3 membros · Ana/)).toBeInTheDocument();
  });

  it("RF-10: erro na busca não bloqueia o campo (fire-and-forget)", async () => {
    vi.mocked(apiClient).mockRejectedValue(new Error("network down") as never);
    const user = userEvent.setup();
    renderCombobox();

    const input = screen.getByRole("combobox");
    await user.type(input, "Qualquer posto");

    expect(input).toHaveValue("Qualquer posto");
    expect(input).not.toBeDisabled();
  });
});
