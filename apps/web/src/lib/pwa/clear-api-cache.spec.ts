import { afterEach, describe, expect, it, vi } from "vitest";
import { clearApiCache } from "./clear-api-cache";

describe("clearApiCache", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("SPEC-20260712-001 RF-16 (T10): remove 'nave-api-data' e 'nave-pages' no logout", async () => {
    const deleteMock = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", { delete: deleteMock });

    await clearApiCache();

    expect(deleteMock).toHaveBeenCalledWith("nave-api-data");
    expect(deleteMock).toHaveBeenCalledWith("nave-pages");
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });

  it("não lança quando Cache Storage falha ao remover um dos caches", async () => {
    vi.stubGlobal("caches", { delete: vi.fn().mockRejectedValue(new Error("boom")) });

    await expect(clearApiCache()).resolves.toBeUndefined();
  });

  it("remove 'nave-pages' mesmo que 'nave-api-data' falhe (e vice-versa) — falhas isoladas", async () => {
    const deleteMock = vi.fn((name: string) =>
      name === "nave-api-data" ? Promise.reject(new Error("boom")) : Promise.resolve(true),
    );
    vi.stubGlobal("caches", { delete: deleteMock });

    await clearApiCache();

    expect(deleteMock).toHaveBeenCalledWith("nave-api-data");
    expect(deleteMock).toHaveBeenCalledWith("nave-pages");
  });
});
