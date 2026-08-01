import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./src/lib/auth/decode-jwt-exp", () => ({
  decodeJwtExp: vi.fn(),
}));

import { decodeJwtExp } from "./src/lib/auth/decode-jwt-exp";
import { config, middleware } from "./middleware";

function createRequest(
  path: string,
  cookies: Record<string, string> = {},
): NextRequest {
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

describe("middleware", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("redireciona para /login com ?redirect quando não há access token (S1)", async () => {
    const request = createRequest("/dashboard");

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?redirect=%2Fdashboard",
    );
  });

  it("permite acesso quando o access token é válido", async () => {
    vi.mocked(decodeJwtExp).mockReturnValue(Date.now() + 60_000);
    const request = createRequest("/dashboard", {
      navestory_access_token: "valid-token",
    });

    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("redireciona /login → /dashboard quando já autenticado (STORY-01 cenário 4)", async () => {
    vi.mocked(decodeJwtExp).mockReturnValue(Date.now() + 60_000);
    const request = createRequest("/login", {
      navestory_access_token: "valid-token",
    });

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard",
    );
  });

  it("permite acesso a rota pública sem token", async () => {
    const request = createRequest("/login");

    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("permite acesso à landing pública ('/') sem token", async () => {
    const request = createRequest("/");

    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("SPEC-20260719-001: permite acesso a /restore-account sem token, sem redirecionar", async () => {
    const request = createRequest("/restore-account");

    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it.each(["/privacidade", "/termos"])(
    "SPEC-20260720-001 RF-04: permite acesso a '%s' sem token, sem redirecionar",
    async (path) => {
      const request = createRequest(path);

      const response = await middleware(request);

      expect(response.status).toBe(200);
    },
  );

  it.each(["/privacidade", "/termos"])(
    "SPEC-20260720-001 RF-04: permite acesso a '%s' mesmo autenticado, sem redirecionar",
    async (path) => {
      vi.mocked(decodeJwtExp).mockReturnValue(Date.now() + 60_000);
      const request = createRequest(path, {
        navestory_access_token: "valid-token",
      });

      const response = await middleware(request);

      expect(response.status).toBe(200);
    },
  );

  it("redireciona '/' → /dashboard quando já autenticado", async () => {
    vi.mocked(decodeJwtExp).mockReturnValue(Date.now() + 60_000);
    const request = createRequest("/", {
      navestory_access_token: "valid-token",
    });

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard",
    );
  });

  it("renova a sessão via /auth/refresh quando o access token expirou mas há refresh token", async () => {
    vi.mocked(decodeJwtExp).mockReturnValue(Date.now() - 1000);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          getSetCookie: () => ["navestory_access_token=novo; HttpOnly"],
        },
      }),
    );
    const request = createRequest("/dashboard", {
      navestory_access_token: "expired-token",
      navestory_refresh_token: "refresh-token",
    });

    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      "navestory_access_token=novo",
    );
  });

  it("redireciona para /login quando o refresh também falha", async () => {
    vi.mocked(decodeJwtExp).mockReturnValue(Date.now() - 1000);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const request = createRequest("/dashboard", {
      navestory_access_token: "expired-token",
      navestory_refresh_token: "refresh-token",
    });

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redireciona para /login quando a chamada de refresh lança erro de rede", async () => {
    vi.mocked(decodeJwtExp).mockReturnValue(Date.now() - 1000);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const request = createRequest("/dashboard", {
      navestory_access_token: "expired-token",
      navestory_refresh_token: "refresh-token",
    });

    const response = await middleware(request);

    expect(response.status).toBe(307);
  });

  describe("SPEC-20260712-001 RF-05, RF-07 — matcher exclui rotas PWA públicas", () => {
    // O matcher do Next.js usa sintaxe própria de negative lookahead — testado fim-a-fim via
    // `pnpm build && pnpm start` (200 em /serwist/sw.js, /manifest.webmanifest, /offline sem
    // sessão; 307 em /dashboard). Aqui apenas garante que ninguém remova as exclusões sem
    // querer — checagem estrutural do padrão, não execução do regex.
    it.each(["serwist", "manifest.webmanifest", "icons", "offline"])(
      "exclui '%s' do matcher de autenticação",
      (excludedSegment) => {
        expect(config.matcher[0]).toContain(excludedSegment);
      },
    );
  });
});
