import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateTimestampMock, expireEntriesMock } = vi.hoisted(() => ({
  updateTimestampMock: vi.fn().mockResolvedValue(undefined),
  expireEntriesMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("serwist", () => ({
  CacheExpiration: vi.fn().mockImplementation(() => ({
    updateTimestamp: updateTimestampMock,
    expireEntries: expireEntriesMock,
  })),
}));

import { apiCacheRetentionPlugin } from "./api-cache-retention-plugin";

describe("apiCacheRetentionPlugin", () => {
  beforeEach(() => {
    updateTimestampMock.mockClear();
    expireEntriesMock.mockClear();
  });

  it("SPEC-20260712-001 RF-10: cacheDidUpdate atualiza o timestamp da entrada", async () => {
    const request = { url: "https://api.example.com/vehicles" };

    await apiCacheRetentionPlugin.cacheDidUpdate?.({ request } as Parameters<NonNullable<typeof apiCacheRetentionPlugin.cacheDidUpdate>>[0]);

    expect(updateTimestampMock).toHaveBeenCalledWith("https://api.example.com/vehicles");
  });

  it("SPEC-20260712-001 RNF-06: cacheDidUpdate expira entradas antigas após atualização", async () => {
    const request = { url: "https://api.example.com/expenses" };

    await apiCacheRetentionPlugin.cacheDidUpdate?.({ request } as Parameters<NonNullable<typeof apiCacheRetentionPlugin.cacheDidUpdate>>[0]);

    expect(expireEntriesMock).toHaveBeenCalledTimes(1);
  });

  it("executa updateTimestamp antes de expireEntries (ordem garantida)", async () => {
    const calls: string[] = [];
    updateTimestampMock.mockImplementation(async () => { calls.push("updateTimestamp"); });
    expireEntriesMock.mockImplementation(async () => { calls.push("expireEntries"); });

    const request = { url: "https://api.example.com/maintenance" };
    await apiCacheRetentionPlugin.cacheDidUpdate?.({ request } as Parameters<NonNullable<typeof apiCacheRetentionPlugin.cacheDidUpdate>>[0]);

    expect(calls).toEqual(["updateTimestamp", "expireEntries"]);
  });
});
