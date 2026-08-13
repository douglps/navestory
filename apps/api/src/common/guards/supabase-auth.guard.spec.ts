import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { jwtVerify } from "jose";
import { SupabaseAuthGuard } from "./supabase-auth.guard";

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
}));

const mockedJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;

/**
 * @spec RULES.md S1
 * Suíte dedicada ao guard (achado #3 da auditoria — T3). Cobre os 5 casos do escopo: token
 * ausente, token expirado, token de tipo errado, conta soft-deleted e token válido de conta
 * ativa. O caso de soft-delete é teste de regressão real: falha se alguém remover a checagem
 * de `profile.deleted_at`, não apenas se mudar a forma do código. `jwtVerify` é mockado porque
 * a validação agora é local via JWKS (ver `supabase-jwt.util.ts`), não mais um round-trip a
 * `auth.getUser()`.
 */
describe("SupabaseAuthGuard", () => {
  function createContext(req: Partial<Request>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  }

  function createConfigService() {
    return { getOrThrow: jest.fn().mockReturnValue("https://project.supabase.co") } as never;
  }

  function createSupabaseAdmin(profile: { data: unknown; error: unknown }) {
    const profilesBuilder: Record<string, unknown> = {};
    profilesBuilder.select = jest.fn().mockReturnValue(profilesBuilder);
    profilesBuilder.eq = jest.fn().mockReturnValue(profilesBuilder);
    profilesBuilder.maybeSingle = jest.fn().mockResolvedValue(profile);

    return { from: jest.fn().mockReturnValue(profilesBuilder) };
  }

  function createGuard(profile: { data: unknown; error: unknown }) {
    const supabaseAdmin = createSupabaseAdmin(profile);
    return {
      guard: new SupabaseAuthGuard(supabaseAdmin as never, {} as never, createConfigService()),
      supabaseAdmin,
    };
  }

  beforeEach(() => {
    mockedJwtVerify.mockReset();
    mockedJwtVerify.mockResolvedValue({
      payload: { sub: "u1", email: "ana@example.com", aud: "authenticated" },
    } as never);
  });

  it("lança 403 ACCOUNT_PENDING_DELETION quando a conta está soft-deleted", async () => {
    const deletedAt = "2026-07-20T00:00:00.000Z";
    const { guard } = createGuard({ data: { deleted_at: deletedAt }, error: null });
    const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toMatchObject({
      response: expect.objectContaining({ code: "ACCOUNT_PENDING_DELETION", deleted_at: deletedAt }),
    });
    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("permite acesso quando a conta não está soft-deleted", async () => {
    const { guard } = createGuard({ data: { deleted_at: null }, error: null });
    const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as unknown as Request & {
      user?: unknown;
    };

    await expect(guard.canActivate(createContext(req))).resolves.toBe(true);
    expect(req.user).toEqual(expect.objectContaining({ sub: "u1" }));
  });

  it("lança 401 genérico quando o perfil não existe", async () => {
    const { guard } = createGuard({ data: null, error: null });
    const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("lança 401 quando não há token", async () => {
    const { guard } = createGuard({ data: { deleted_at: null }, error: null });
    const req = { headers: {}, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("lança 401 quando o token está expirado", async () => {
    mockedJwtVerify.mockRejectedValueOnce(new Error("JWT expired"));
    const { guard } = createGuard({ data: { deleted_at: null }, error: null });
    const req = { headers: { authorization: "Bearer expired-token" }, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("lança 401 quando o token é de tipo errado (aud !== authenticated)", async () => {
    mockedJwtVerify.mockResolvedValueOnce({
      payload: { sub: "u1", email: "ana@example.com", aud: "anon" },
    } as never);
    const { guard } = createGuard({ data: { deleted_at: null }, error: null });
    const req = { headers: { authorization: "Bearer wrong-type-token" }, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("cacheia deleted_at por 5s e não repete a query em chamadas seguidas do mesmo usuário", async () => {
    const { guard, supabaseAdmin } = createGuard({ data: { deleted_at: null }, error: null });
    const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as unknown as Request;

    await guard.canActivate(createContext(req));
    await guard.canActivate(createContext(req));

    expect(supabaseAdmin.from).toHaveBeenCalledTimes(1);
  });
});
