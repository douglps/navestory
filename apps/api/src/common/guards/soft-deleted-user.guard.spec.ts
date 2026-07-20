import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { SoftDeletedUserGuard } from "./soft-deleted-user.guard";

describe("SoftDeletedUserGuard", () => {
  function createContext(req: Partial<Request>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  }

  function createSupabaseAdmin(overrides?: {
    getUser?: unknown;
    profile?: { data: unknown; error: unknown };
  }) {
    const profilesBuilder: Record<string, unknown> = {};
    profilesBuilder.select = jest.fn().mockReturnValue(profilesBuilder);
    profilesBuilder.eq = jest.fn().mockReturnValue(profilesBuilder);
    profilesBuilder.maybeSingle = jest
      .fn()
      .mockResolvedValue(overrides?.profile ?? { data: { deleted_at: new Date().toISOString() }, error: null });

    return {
      auth: {
        getUser: jest.fn().mockResolvedValue(
          overrides?.getUser ?? {
            data: { user: { id: "u1", email: "ana@example.com", aud: "authenticated" } },
            error: null,
          },
        ),
      },
      from: jest.fn().mockReturnValue(profilesBuilder),
    };
  }

  it("aceita token válido de conta soft-deleted (deleted_at != null)", async () => {
    const supabaseAdmin = createSupabaseAdmin();
    const guard = new SoftDeletedUserGuard(supabaseAdmin as never);
    const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as unknown as Request & {
      user?: unknown;
    };

    const result = await guard.canActivate(createContext(req));

    expect(result).toBe(true);
    expect(req.user).toEqual(
      expect.objectContaining({ sub: "u1", email: "ana@example.com", aud: "authenticated" }),
    );
  });

  it("aceita também conta sem soft-delete (deleted_at null)", async () => {
    const supabaseAdmin = createSupabaseAdmin({ profile: { data: { deleted_at: null }, error: null } });
    const guard = new SoftDeletedUserGuard(supabaseAdmin as never);
    const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).resolves.toBe(true);
  });

  it("rejeita quando não há token", async () => {
    const supabaseAdmin = createSupabaseAdmin();
    const guard = new SoftDeletedUserGuard(supabaseAdmin as never);
    const req = { headers: {}, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejeita quando o Supabase Auth rejeita o token", async () => {
    const supabaseAdmin = createSupabaseAdmin({ getUser: { data: { user: null }, error: new Error("inválido") } });
    const guard = new SoftDeletedUserGuard(supabaseAdmin as never);
    const req = { headers: { authorization: "Bearer bad-token" }, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejeita quando o perfil não existe", async () => {
    const supabaseAdmin = createSupabaseAdmin({ profile: { data: null, error: null } });
    const guard = new SoftDeletedUserGuard(supabaseAdmin as never);
    const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
