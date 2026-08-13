import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { jwtVerify } from "jose";
import { SoftDeletedUserGuard } from "./soft-deleted-user.guard";

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
}));

const mockedJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;

describe("SoftDeletedUserGuard", () => {
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

  function createSupabaseAdmin(overrides?: { profile?: { data: unknown; error: unknown } }) {
    const profilesBuilder: Record<string, unknown> = {};
    profilesBuilder.select = jest.fn().mockReturnValue(profilesBuilder);
    profilesBuilder.eq = jest.fn().mockReturnValue(profilesBuilder);
    profilesBuilder.maybeSingle = jest
      .fn()
      .mockResolvedValue(overrides?.profile ?? { data: { deleted_at: new Date().toISOString() }, error: null });

    return { from: jest.fn().mockReturnValue(profilesBuilder) };
  }

  function createGuard(overrides?: Parameters<typeof createSupabaseAdmin>[0]) {
    const supabaseAdmin = createSupabaseAdmin(overrides);
    return new SoftDeletedUserGuard(supabaseAdmin as never, {} as never, createConfigService());
  }

  beforeEach(() => {
    mockedJwtVerify.mockReset();
    mockedJwtVerify.mockResolvedValue({
      payload: { sub: "u1", email: "ana@example.com", aud: "authenticated" },
    } as never);
  });

  it("aceita token válido de conta soft-deleted (deleted_at != null)", async () => {
    const guard = createGuard();
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
    const guard = createGuard({ profile: { data: { deleted_at: null }, error: null } });
    const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).resolves.toBe(true);
  });

  it("rejeita quando não há token", async () => {
    const guard = createGuard();
    const req = { headers: {}, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejeita quando o Supabase Auth rejeita o token", async () => {
    mockedJwtVerify.mockRejectedValueOnce(new Error("inválido"));
    const guard = createGuard();
    const req = { headers: { authorization: "Bearer bad-token" }, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejeita quando o perfil não existe", async () => {
    const guard = createGuard({ profile: { data: null, error: null } });
    const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as unknown as Request;

    await expect(guard.canActivate(createContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
