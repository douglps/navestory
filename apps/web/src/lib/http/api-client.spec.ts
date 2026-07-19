import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { useConnectivityStore } from "@/lib/pwa/connectivity-store";
import { apiClient, ApiError, ApiUnavailableError, OfflineWriteBlockedError } from "./api-client";

describe("apiClient", () => {
  beforeEach(() => {
    useDashboardStore.getState().clearAllSelection();
    useUIStore.setState({ toasts: [] });
    useConnectivityStore.setState({ isOnline: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna data quando a resposta é bem-sucedida", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { message: "ok" } }),
      }),
    );

    const result = await apiClient<{ message: string }>("/auth/login", { method: "POST" });

    expect(result).toEqual({ message: "ok" });
  });

  it("lança ApiError com o statusCode quando a resposta não é ok (STORY-02)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: "INVALID_CREDENTIALS" }),
      }),
    );

    await expect(apiClient("/auth/login", { method: "POST" })).rejects.toMatchObject({
      statusCode: 401,
      message: "INVALID_CREDENTIALS",
    });
  });

  it("lança ApiUnavailableError em erro 5xx (STORY-08)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    );

    await expect(apiClient("/auth/login")).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it("SPEC-20260712-001 RF-11: GET não é bloqueado antes da rede quando offline — precisa chegar ao fetch() para o Service Worker poder responder do cache (RF-08)", async () => {
    useConnectivityStore.setState({ isOnline: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [] }) }),
    );

    const result = await apiClient("/vehicles");

    expect(result).toEqual([]);
    expect(fetch).toHaveBeenCalled();
  });

  it("SPEC-20260712-001 RF-11: bloqueia mutação antes de qualquer chamada de rede quando offline", async () => {
    useConnectivityStore.setState({ isOnline: false });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiClient("/expenses", { method: "POST", body: { amount: 10 } }),
    ).rejects.toBeInstanceOf(OfflineWriteBlockedError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useUIStore.getState().toasts[0]?.title).toBe(
      "Sem conexão — não é possível salvar agora. Tente novamente quando a internet voltar.",
    );
  });

  it("SPEC-20260712-001 RF-11.1/R-PWA-08: trata falha de rede real numa mutação como offline retroativo mesmo com navigator.onLine=true (EC-08)", async () => {
    useConnectivityStore.setState({ isOnline: true });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    await expect(
      apiClient("/expenses", { method: "POST", body: { amount: 10 } }),
    ).rejects.toBeInstanceOf(OfflineWriteBlockedError);
    expect(useConnectivityStore.getState().isOnline).toBe(false);
  });

  it("lança ApiUnavailableError em timeout (>10s, STORY-08)", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () => {
              const error = new Error("aborted");
              error.name = "AbortError";
              reject(error);
            });
          }),
      ),
    );

    const assertion = expect(apiClient("/auth/login")).rejects.toBeInstanceOf(
      ApiUnavailableError,
    );
    await vi.advanceTimersByTimeAsync(10_001);
    await assertion;
    vi.useRealTimers();
  });

  it("ApiError mantém o nome da classe", () => {
    const error = new ApiError("erro", 400);
    expect(error.name).toBe("ApiError");
  });

  it("SPEC-20260603-001 RF-22: 404 em GET /vehicles/:id do veículo ativo limpa o contexto e exibe o toast", async () => {
    useDashboardStore.getState().setActiveVehicle("v1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: "Veículo não encontrado" }),
      }),
    );

    await expect(apiClient("/vehicles/v1")).rejects.toBeInstanceOf(ApiError);

    expect(useDashboardStore.getState().selectionMode).toBe("none");
    expect(useDashboardStore.getState().activeVehicleId).toBeNull();
    expect(useUIStore.getState().toasts[0]?.title).toBe(
      "O veículo selecionado não está mais disponível",
    );
  });

  it("RF-22: 404 de uma entidade não relacionada ao veículo ativo não limpa o contexto", async () => {
    useDashboardStore.getState().setActiveVehicle("v1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: "Categoria não encontrada" }),
      }),
    );

    await expect(apiClient("/categories/other-id")).rejects.toBeInstanceOf(ApiError);

    expect(useDashboardStore.getState().activeVehicleId).toBe("v1");
    expect(useUIStore.getState().toasts).toHaveLength(0);
  });

  it("RF-22: 404 sem veículo ativo no store não dispara limpeza", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    );

    await expect(apiClient("/vehicles/v1")).rejects.toBeInstanceOf(ApiError);

    expect(useUIStore.getState().toasts).toHaveLength(0);
  });
});
