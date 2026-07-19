import { afterEach, describe, expect, it, vi } from "vitest";
import { clearApiCache } from "./clear-api-cache";

describe("clearApiCache", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("SPEC-20260712-001 RF-16: remove apenas o cache 'nave-api-data', preservando os demais", async () => {
    const deleteMock = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", { delete: deleteMock });

    await clearApiCache();

    expect(deleteMock).toHaveBeenCalledWith("nave-api-data");
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it("não lança quando Cache Storage falha ao remover", async () => {
    vi.stubGlobal("caches", { delete: vi.fn().mockRejectedValue(new Error("boom")) });

    await expect(clearApiCache()).resolves.toBeUndefined();
  });
});
