import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import PreferencesPage from "./page";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

describe("PreferencesPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <PreferencesPage />
      </QueryProvider>,
    );
  }

  it("carrega o valor atual da preferência (RF-01.3)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: true });
    renderPage();

    const checkbox = await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it("default desativado quando ausente (R-PREF-01, R-PREF-02)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false });
    renderPage();

    const checkbox = await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    expect(checkbox).not.toBeChecked();
  });

  it("botão Salvar fica desabilitado até alterar o toggle", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    expect(screen.getAllByRole("button", { name: "Salvar" })[0]).toBeDisabled();
  });

  it("salva a preferência ao clicar em Salvar (RF-02)", async () => {
    vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === "PATCH") {
        return Promise.resolve({ auto_draft_enabled: true });
      }
      return Promise.resolve({ auto_draft_enabled: false });
    });
    renderPage();

    const checkbox = await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    fireEvent.click(checkbox);
    const [saveDraftButton] = screen.getAllByRole("button", { name: "Salvar" });
    fireEvent.click(saveDraftButton!);

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/preferences",
        expect.objectContaining({ method: "PATCH", body: { auto_draft_enabled: true } }),
      ),
    );
    expect(await screen.findByText("Salvo.")).toBeInTheDocument();
  });

  it("mostra erro quando o salvamento falha", async () => {
    vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === "PATCH") {
        return Promise.reject(new Error("falhou"));
      }
      return Promise.resolve({ auto_draft_enabled: false });
    });
    renderPage();

    const checkbox = await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    fireEvent.click(checkbox);
    const [saveDraftButton] = screen.getAllByRole("button", { name: "Salvar" });
    fireEvent.click(saveDraftButton!);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

describe("PreferencesPage — exibição do veículo (SPEC-20260603-003)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <PreferencesPage />
      </QueryProvider>,
    );
  }

  it("carrega a configuração padrão quando ausente (R-DISP-03)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    expect(screen.getByTestId("chip-preview")).toHaveTextContent("Toyota ABC1D23 Corolla");
  });

  it("placa não pode ser desmarcada (RF-01)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    const plateCheckbox = screen.getByRole("checkbox", { name: /Placa/ });
    expect(plateCheckbox).toBeChecked();
    expect(plateCheckbox).toBeDisabled();
  });

  it("prévia atualiza em tempo real ao marcar Apelido (RNF-03, CT-05)", async () => {
    vi.mocked(apiClient).mockResolvedValue({
      auto_draft_enabled: false,
      vehicle_chip_fields: ["plate"],
    });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    expect(screen.getByTestId("chip-preview")).toHaveTextContent("ABC1D23");

    fireEvent.click(screen.getByRole("checkbox", { name: "Apelido" }));

    expect(screen.getByTestId("chip-preview")).toHaveTextContent("ABC1D23 Branquinho");
  });

  it("salva vehicle_chip_fields ao clicar em Salvar (RF-06)", async () => {
    vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === "PATCH") {
        return Promise.resolve({ auto_draft_enabled: false, vehicle_chip_fields: ["plate"] });
      }
      return Promise.resolve({ auto_draft_enabled: false, vehicle_chip_fields: ["make", "plate", "model"] });
    });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    fireEvent.click(screen.getByRole("checkbox", { name: "Marca" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Modelo" }));
    const saveButtons = screen.getAllByRole("button", { name: "Salvar" });
    fireEvent.click(saveButtons[1]!);

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/preferences",
        expect.objectContaining({ method: "PATCH", body: { vehicle_chip_fields: ["plate"] } }),
      ),
    );
  });

  it("cancela alterações do rascunho automático (handleCancelDraft)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false });
    renderPage();

    const checkbox = await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    fireEvent.click(checkbox); // torna isDraftDirty=true

    const cancelBtns = screen.getAllByRole("button", { name: "Cancelar" });
    expect(cancelBtns[0]).not.toBeDisabled();
    fireEvent.click(cancelBtns[0]!); // handleCancelDraft

    // após cancelar, isDraftDirty=false → botão volta a ficar desabilitado
    expect(screen.getAllByRole("button", { name: "Cancelar" })[0]).toBeDisabled();
  });

  it("move campo na ordem do chip (handleMoveChipField)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    // DEFAULT_CHIP_FIELDS = ["make", "plate", "model"]
    // "Mover Marca para baixo" → index=0, direction=1 → troca make e plate
    fireEvent.click(screen.getByRole("button", { name: "Mover Marca para baixo" }));

    // isChipDirty=true → Salvar[1] passa a ser habilitado
    const saveBtns = screen.getAllByRole("button", { name: "Salvar" });
    expect(saveBtns[1]).not.toBeDisabled();
  });

  it("cancela alterações da exibição do veículo (handleCancelChipFields)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    fireEvent.click(screen.getByRole("checkbox", { name: "Apelido" })); // isChipDirty=true

    const cancelBtns = screen.getAllByRole("button", { name: "Cancelar" });
    expect(cancelBtns[1]).not.toBeDisabled();
    fireEvent.click(cancelBtns[1]!); // handleCancelChipFields

    // isChipDirty=false → botão desabilitado novamente
    expect(screen.getAllByRole("button", { name: "Cancelar" })[1]).toBeDisabled();
  });

  it("altera o campo de fuso horário (handleTimezoneChange)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false, timezone: "America/Sao_Paulo" });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    const tzInput = screen.getByLabelText("Selecionar fuso");
    fireEvent.change(tzInput, { target: { value: "America/Manaus" } });

    // isTzDirty=true → Salvar[2] habilitado
    const saveBtns = screen.getAllByRole("button", { name: "Salvar" });
    expect(saveBtns[2]).not.toBeDisabled();
  });

  it("salva o fuso horário ao clicar em Salvar (handleSaveTimezone)", async () => {
    vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === "PATCH") {
        return Promise.resolve({ auto_draft_enabled: false, timezone: "America/Manaus" });
      }
      return Promise.resolve({ auto_draft_enabled: false, timezone: "America/Sao_Paulo" });
    });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    fireEvent.change(screen.getByLabelText("Selecionar fuso"), { target: { value: "America/Manaus" } });

    const saveBtns = screen.getAllByRole("button", { name: "Salvar" });
    fireEvent.click(saveBtns[2]!);

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/preferences",
        expect.objectContaining({ method: "PATCH", body: { timezone: "America/Manaus" } }),
      ),
    );
    expect(await screen.findByText("Salvo.")).toBeInTheDocument();
  });

  it("cancela alterações de fuso horário (handleCancelTimezone)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false, timezone: "America/Sao_Paulo" });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    const tzInput = screen.getByLabelText("Selecionar fuso");
    fireEvent.change(tzInput, { target: { value: "America/Manaus" } });

    const cancelBtns = screen.getAllByRole("button", { name: "Cancelar" });
    fireEvent.click(cancelBtns[2]!); // handleCancelTimezone

    // volta ao valor original
    expect(tzInput).toHaveValue("America/Sao_Paulo");
  });

  it("exibe erro ao salvar fuso horário inválido (handleSaveTimezone — branch de falha)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false, timezone: "" });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    // fuso com espaço é inválido pelo timezoneSchema
    fireEvent.change(screen.getByLabelText("Selecionar fuso"), { target: { value: "Invalido Com Espaço" } });

    const saveBtns = screen.getAllByRole("button", { name: "Salvar" });
    fireEvent.click(saveBtns[2]!);

    expect(await screen.findByRole("alert")).toHaveTextContent("Fuso horário deve ser um nome IANA");
  });
});

describe("PreferencesPage — janela do KPI de gastos recentes (SPEC-20260804-001)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <PreferencesPage />
      </QueryProvider>,
    );
  }

  it("marca 7 dias como padrão quando a preferência está ausente (US-02, R-PREF-01)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    expect(screen.getByRole("radio", { name: "7 dias" })).toHaveAttribute("aria-checked", "true");
  });

  it("marca a janela persistida como selecionada (US-02)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false, spending_window_days: 30 });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    expect(screen.getByRole("radio", { name: "30 dias" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "7 dias" })).toHaveAttribute("aria-checked", "false");
  });

  it("salva spending_window_days ao selecionar 14 dias e clicar em Salvar (RF-05, US-02)", async () => {
    vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === "PATCH") {
        return Promise.resolve({ auto_draft_enabled: false, spending_window_days: 14 });
      }
      return Promise.resolve({ auto_draft_enabled: false, spending_window_days: 7 });
    });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    fireEvent.click(screen.getByRole("radio", { name: "14 dias" }));
    const saveBtns = screen.getAllByRole("button", { name: "Salvar" });
    fireEvent.click(saveBtns[3]!);

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/preferences",
        expect.objectContaining({ method: "PATCH", body: { spending_window_days: 14 } }),
      ),
    );
    expect(await screen.findByText("Salvo.")).toBeInTheDocument();
  });

  it("cancela alteração da janela sem salvar (handleCancelWindow)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false, spending_window_days: 7 });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    fireEvent.click(screen.getByRole("radio", { name: "30 dias" }));
    expect(screen.getByRole("radio", { name: "30 dias" })).toHaveAttribute("aria-checked", "true");

    const cancelBtns = screen.getAllByRole("button", { name: "Cancelar" });
    fireEvent.click(cancelBtns[3]!);

    expect(screen.getByRole("radio", { name: "7 dias" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "30 dias" })).toHaveAttribute("aria-checked", "false");
  });
});
