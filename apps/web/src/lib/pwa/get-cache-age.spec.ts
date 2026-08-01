import { afterEach, describe, expect, it, vi } from "vitest";
import { getMostRecentCacheTimestamp } from "./get-cache-age";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getMostRecentCacheTimestamp", () => {
  it("SPEC-20260712-001 RF-13: retorna null quando Cache Storage não está disponível", async () => {
    vi.stubGlobal("caches", undefined);

    const result = await getMostRecentCacheTimestamp("/dashboard");

    expect(result).toBeNull();
  });

  it("SPEC-20260712-001 RF-13.1: retorna o timestamp do header Date da página em cache", async () => {
    const pageDate = "Sat, 18 Jul 2026 08:42:00 GMT";
    const pageResponse = { headers: { get: vi.fn().mockReturnValue(pageDate) } };
    const pagesCache = {
      match: vi.fn().mockResolvedValue(pageResponse),
    };
    const apiCache = {
      keys: vi.fn().mockResolvedValue([]),
      match: vi.fn(),
    };
    vi.stubGlobal("caches", {
      open: vi.fn((name: string) =>
        Promise.resolve(name === "navestory-pages" ? pagesCache : apiCache),
      ),
    });

    const result = await getMostRecentCacheTimestamp("/dashboard");

    expect(result).not.toBeNull();
    expect(result?.getTime()).toBe(new Date(pageDate).getTime());
  });

  it("SPEC-20260712-001 RF-13.1: retorna o timestamp mais recente entre página e entradas de API", async () => {
    const olderDate = "Fri, 17 Jul 2026 10:00:00 GMT";
    const newerDate = "Sat, 18 Jul 2026 09:00:00 GMT";

    const pageResponse = { headers: { get: vi.fn().mockReturnValue(olderDate) } };
    const apiResponse = { headers: { get: vi.fn().mockReturnValue(newerDate) } };
    const mockRequest = { url: "/api/vehicles" };

    const pagesCache = { match: vi.fn().mockResolvedValue(pageResponse) };
    const apiCache = {
      keys: vi.fn().mockResolvedValue([mockRequest]),
      match: vi.fn().mockResolvedValue(apiResponse),
    };
    vi.stubGlobal("caches", {
      open: vi.fn((name: string) =>
        Promise.resolve(name === "navestory-pages" ? pagesCache : apiCache),
      ),
    });

    const result = await getMostRecentCacheTimestamp("/dashboard");

    expect(result?.getTime()).toBe(new Date(newerDate).getTime());
  });

  it("retorna null quando nenhuma entrada tem header Date", async () => {
    const pagesCache = { match: vi.fn().mockResolvedValue(null) };
    const apiCache = {
      keys: vi.fn().mockResolvedValue([]),
      match: vi.fn(),
    };
    vi.stubGlobal("caches", {
      open: vi.fn((name: string) =>
        Promise.resolve(name === "navestory-pages" ? pagesCache : apiCache),
      ),
    });

    const result = await getMostRecentCacheTimestamp("/dashboard");

    expect(result).toBeNull();
  });

  it("absorve erro do cache de páginas e continua lendo o cache de API", async () => {
    const apiDate = "Sat, 18 Jul 2026 09:00:00 GMT";
    const apiResponse = { headers: { get: vi.fn().mockReturnValue(apiDate) } };
    const mockRequest = { url: "/api/data" };

    vi.stubGlobal("caches", {
      open: vi.fn((name: string) => {
        if (name === "navestory-pages") return Promise.reject(new Error("pages error"));
        return Promise.resolve({
          keys: vi.fn().mockResolvedValue([mockRequest]),
          match: vi.fn().mockResolvedValue(apiResponse),
        });
      }),
    });

    const result = await getMostRecentCacheTimestamp("/dashboard");

    expect(result?.getTime()).toBe(new Date(apiDate).getTime());
  });

  it("absorve erro do cache de API e retorna timestamp de página quando disponível", async () => {
    const pageDate = "Sat, 18 Jul 2026 08:00:00 GMT";
    const pageResponse = { headers: { get: vi.fn().mockReturnValue(pageDate) } };

    vi.stubGlobal("caches", {
      open: vi.fn((name: string) => {
        if (name === "navestory-pages") return Promise.resolve({ match: vi.fn().mockResolvedValue(pageResponse) });
        return Promise.reject(new Error("api error"));
      }),
    });

    const result = await getMostRecentCacheTimestamp("/dashboard");

    expect(result?.getTime()).toBe(new Date(pageDate).getTime());
  });

  it("ignora entradas de API sem header Date", async () => {
    const pagesCache = { match: vi.fn().mockResolvedValue(null) };
    const apiResponseWithoutDate = { headers: { get: vi.fn().mockReturnValue(null) } };
    const mockRequest = { url: "/api/data" };
    const apiCache = {
      keys: vi.fn().mockResolvedValue([mockRequest]),
      match: vi.fn().mockResolvedValue(apiResponseWithoutDate),
    };
    vi.stubGlobal("caches", {
      open: vi.fn((name: string) =>
        Promise.resolve(name === "navestory-pages" ? pagesCache : apiCache),
      ),
    });

    const result = await getMostRecentCacheTimestamp("/dashboard");

    expect(result).toBeNull();
  });
});
