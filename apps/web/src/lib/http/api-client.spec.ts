import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { apiClient, ApiError, ApiUnavailableError } from "./api-client";

describe("apiClient", () => {
  beforeEach(() => {
    useDashboardStore.getState().clearAllSelection();
    useUIStore.getState().clearContextStaleNotice();
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

  it("lança ApiUnavailableError quando offline (navigator.onLine=false)", async () => {
    vi.stubGlobal("navigator", { onLine: false });

    await expect(apiClient("/auth/login")).rejects.toBeInstanceOf(ApiUnavailableError);
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
    expect(useUIStore.getState().contextStaleNotice).toBe(
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
    expect(useUIStore.getState().contextStaleNotice).toBeNull();
  });

  it("RF-22: 404 sem veículo ativo no store não dispara limpeza", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    );

    await expect(apiClient("/vehicles/v1")).rejects.toBeInstanceOf(ApiError);

    expect(useUIStore.getState().contextStaleNotice).toBeNull();
  });
});
