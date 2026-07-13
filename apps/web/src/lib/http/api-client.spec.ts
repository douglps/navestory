import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiError, ApiUnavailableError } from "./api-client";

describe("apiClient", () => {
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
});
