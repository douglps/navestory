import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import * as Sentry from "@sentry/nestjs";
import { RolesGuard } from "./roles.guard";

jest.mock("@sentry/nestjs", () => ({ captureMessage: jest.fn() }));

describe("RolesGuard", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("permite acesso quando a rota não exige role (@Roles ausente)", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it("bloqueia usuário comum em rota @Roles('admin') (RNF-01)", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["admin"]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { sub: "u1", app_metadata: { role: "user" } },
          url: "/admin/users",
          method: "GET",
        }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(false);
  });

  // @spec SPEC-20260807-002 RF-B01 — valida S16
  it("emite Sentry.captureMessage warning quando nega acesso a rota @Roles('admin') (RF-B01)", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["admin"]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { sub: "u1", app_metadata: { role: "user" } },
          url: "/admin/users",
          method: "GET",
        }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;

    guard.canActivate(context);

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Acesso admin negado: role insuficiente",
      expect.objectContaining({
        level: "warning",
        tags: { security_event: true, scenario: "unauthorized_admin_access" },
        extra: expect.objectContaining({
          userId: "u1",
          route: "/admin/users",
          method: "GET",
          requiredRole: ["admin"],
          actualRole: "user",
        }),
      }),
    );
  });

  it("não emite Sentry quando o acesso é permitido", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["admin"]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: "u1", app_metadata: { role: "admin" } } }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;

    guard.canActivate(context);

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("permite admin em rota @Roles('admin')", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["admin"]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: "u1", app_metadata: { role: "admin" } } }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  /**
   * @spec SPEC-20260731-006 RF-SEC-005 — valida S12
   * Critério de fechamento da vulnerabilidade: `user_metadata.role` é gravável pelo próprio
   * usuário via API pública do Supabase — mesmo forjado como "admin", não pode conceder acesso.
   */
  it("bloqueia usuário com user_metadata.role='admin' forjado, sem app_metadata.role (S12)", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["admin"]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { sub: "u1", user_metadata: { role: "admin" } },
        }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(false);
  });

  it("bloqueia (fail-safe) quando não há usuário no request", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["admin"]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(false);
  });
});
