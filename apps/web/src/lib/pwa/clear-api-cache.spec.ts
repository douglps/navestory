import { afterEach, describe, expect, it, vi } from "vitest";
import { clearApiCache } from "./clear-api-cache";

describe("clearApiCache", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("SPEC-20260712-001 RF-16 (T10): remove 'navestory-api-data' e 'navestory-pages' no logout", async () => {
    const deleteMock = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", { delete: deleteMock });

    await clearApiCache();

    expect(deleteMock).toHaveBeenCalledWith("navestory-api-data");
    expect(deleteMock).toHaveBeenCalledWith("navestory-pages");
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });

  it("não lança quando Cache Storage falha ao remover um dos caches", async () => {
    vi.stubGlobal("caches", {
      delete: vi.fn().mockRejectedValue(new Error("boom")),
    });

    await expect(clearApiCache()).resolves.toBeUndefined();
  });

  it("remove 'navestory-pages' mesmo que 'navestory-api-data' falhe (e vice-versa) — falhas isoladas", async () => {
    const deleteMock = vi.fn((name: string) =>
      name === "navestory-api-data"
        ? Promise.reject(new Error("boom"))
        : Promise.resolve(true),
    );
    vi.stubGlobal("caches", { delete: deleteMock });

    await clearApiCache();

    expect(deleteMock).toHaveBeenCalledWith("navestory-api-data");
    expect(deleteMock).toHaveBeenCalledWith("navestory-pages");
  });
});
