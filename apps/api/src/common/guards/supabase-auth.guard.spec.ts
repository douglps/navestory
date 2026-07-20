import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { SupabaseAuthGuard } from "./supabase-auth.guard";

/**
 * @spec RULES.md S1
 * Suíte dedicada ao guard (achado #3 da auditoria — T3). Cobre os 5 casos do escopo: token
 * ausente, token expirado, token de tipo errado, conta soft-deleted e token válido de conta
 * ativa. O caso de soft-delete é teste de regressão real: falha se alguém remover a checagem
 * de `profile.deleted_at`, não apenas se mudar a forma do código.
 */
describe("SupabaseAuthGuard", () => {
  function createContext(req: Partial<Request>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  }

  function createSupabaseAdmin(
    profile: { data: unknown; error: unknown },
    authResult: { data: unknown; error: unknown } = {
      data: { user: { id: "u1", email: "ana@example.com", aud: "authenticated" } },
      error: null,
    },
  ) {
    const profilesBuilder: Record<string, unknown> = {};
    profilesBuilder.select = jest.fn().mockReturnValue(profilesBuilder);
    profilesBuilder.eq = jest.fn().mockReturnValue(profilesBuilder);
    profilesBuilder.maybeSingle = jest.fn().mockResolvedValue(profile);

    return {
      auth: {
        getUser: jest.fn().mockResolvedValue(authResult),
      },
      from: jest.fn().mockReturnValue(profilesBuilder),
    };
  }

  it("lança 403 ACCOUNT_PENDING_DELETION quando a conta está soft-deleted", async () => {
    const deletedAt = "2026-07-20T00:00:00.000Z";
    const supabaseAdmin = createSupabaseAdmin({ data: { deleted_at: deletedAt }, error: null });
    const guard = new SupabaseAuthGuard(supabaseAdmin as never);
    const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toMatchObject({
      response: expect.objectContaining({ code: "ACCOUNT_PENDING_DELETION", deleted_at: deletedAt }),
    });
    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("permite acesso quando a conta não está soft-deleted", async () => {
    const supabaseAdmin = createSupabaseAdmin({ data: { deleted_at: null }, error: null });
    const guard = new SupabaseAuthGuard(supabaseAdmin as never);
    const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as unknown as Request & {
      user?: unknown;
    };

    await expect(guard.canActivate(createContext(req))).resolves.toBe(true);
    expect(req.user).toEqual(expect.objectContaining({ sub: "u1" }));
  });

  it("lança 401 genérico quando o perfil não existe", async () => {
    const supabaseAdmin = createSupabaseAdmin({ data: null, error: null });
    const guard = new SupabaseAuthGuard(supabaseAdmin as never);
    const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("lança 401 quando não há token", async () => {
    const supabaseAdmin = createSupabaseAdmin({ data: { deleted_at: null }, error: null });
    const guard = new SupabaseAuthGuard(supabaseAdmin as never);
    const req = { headers: {}, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("lança 401 quando o token está expirado", async () => {
    const supabaseAdmin = createSupabaseAdmin(
      { data: { deleted_at: null }, error: null },
      { data: { user: null }, error: { message: "JWT expired", status: 401 } },
    );
    const guard = new SupabaseAuthGuard(supabaseAdmin as never);
    const req = { headers: { authorization: "Bearer expired-token" }, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("lança 401 quando o token é de tipo errado (aud !== authenticated)", async () => {
    const supabaseAdmin = createSupabaseAdmin(
      { data: { deleted_at: null }, error: null },
      { data: { user: { id: "u1", email: "ana@example.com", aud: "anon" } }, error: null },
    );
    const guard = new SupabaseAuthGuard(supabaseAdmin as never);
    const req = { headers: { authorization: "Bearer wrong-type-token" }, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
