import { ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { AuditService } from "../../shared/audit/audit.service";
import { AuthService } from "./auth.service";

type QueryResult = { data: unknown; error: unknown };

function createQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  builder.select = jest.fn().mockReturnValue(builder);
  builder.eq = jest.fn().mockReturnValue(builder);
  builder.maybeSingle = jest.fn().mockResolvedValue(result);
  builder.upsert = jest.fn().mockResolvedValue(result);
  builder.delete = jest.fn().mockReturnValue(builder);
  builder.insert = jest.fn().mockResolvedValue(result);
  return builder;
}

describe("AuthService", () => {
  const validSession = {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
  };

  function createService(overrides?: {
    signUp?: jest.Mock;
    signInWithPassword?: jest.Mock;
    profilesResult?: QueryResult;
    attemptsResult?: QueryResult;
  }) {
    const profilesBuilder = createQueryBuilder(
      overrides?.profilesResult ?? { data: { id: "user-1" }, error: null },
    );
    const attemptsBuilder = createQueryBuilder(
      overrides?.attemptsResult ?? { data: null, error: null },
    );

    const supabase = {
      auth: {
        signUp: overrides?.signUp ?? jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" }, session: validSession },
          error: null,
        }),
        signInWithPassword:
          overrides?.signInWithPassword ??
          jest.fn().mockResolvedValue({
            data: { user: { id: "user-1" }, session: validSession },
            error: null,
          }),
        refreshSession: jest.fn().mockResolvedValue({ data: { session: validSession }, error: null }),
        resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
        verifyOtp: jest.fn().mockResolvedValue({ data: { session: validSession }, error: null }),
        updateUser: jest.fn().mockResolvedValue({ error: null }),
        admin: {
          deleteUser: jest.fn().mockResolvedValue({ error: null }),
          signOut: jest.fn().mockResolvedValue({ error: null }),
        },
      },
    };

    const supabaseAdmin = {
      auth: supabase.auth,
      from: jest.fn((table: string) =>
        table === "profiles" ? profilesBuilder : attemptsBuilder,
      ),
    };

    const auditService = { log: jest.fn() } as unknown as AuditService;

    const service = new AuthService(
      supabase as never,
      supabaseAdmin as never,
      auditService,
    );

    return { service, supabase, supabaseAdmin, auditService };
  }

  describe("register", () => {
    it("cria conta e retorna sessão (STORY-REG-01)", async () => {
      const { service } = createService();

      const session = await service.register({
        name: "Ana",
        email: "ana@example.com",
        password: "abc12!",
        profile_type: "autonomous",
      });

      expect(session.accessToken).toBe("access-token");
    });

    it("lança 409 quando e-mail já está cadastrado", async () => {
      const { service } = createService({
        signUp: jest.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { status: 422, message: "User already registered" },
        }),
      });

      await expect(
        service.register({ name: "Ana", email: "ana@example.com", password: "abc12!", profile_type: "autonomous" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("lança 500 para erro genérico do signUp (não-duplicata)", async () => {
      const { service } = createService({
        signUp: jest.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { status: 500, message: "erro inesperado" },
        }),
      });

      await expect(
        service.register({ name: "Ana", email: "ana@example.com", password: "abc12!", profile_type: "autonomous" }),
      ).rejects.toThrow("erro inesperado");
    });

    it("lança 500 quando signUp não retorna user/session (sem detalhe de erro)", async () => {
      const { service } = createService({
        signUp: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      });

      await expect(
        service.register({ name: "Ana", email: "ana@example.com", password: "abc12!", profile_type: "autonomous" }),
      ).rejects.toThrow("Falha ao criar conta");
    });

    it("faz rollback (admin.deleteUser) se o profile não foi criado pela trigger", async () => {
      const { service, supabase } = createService({
        profilesResult: { data: null, error: null },
      });

      await expect(
        service.register({ name: "Ana", email: "ana@example.com", password: "abc12!", profile_type: "autonomous" }),
      ).rejects.toThrow();
      expect(supabase.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
    });
  });

  describe("login", () => {
    it("autentica com credenciais válidas (STORY-01)", async () => {
      const { service } = createService();

      const session = await service.login({
        email: "ana@example.com",
        password: "abc12!",
        rememberMe: false,
      });

      expect(session.accessToken).toBe("access-token");
    });

    it("retorna erro genérico INVALID_CREDENTIALS em credenciais inválidas (anti-enumeração)", async () => {
      const { service } = createService({
        signInWithPassword: jest
          .fn()
          .mockResolvedValue({ data: { session: null }, error: { message: "Invalid" } }),
      });

      await expect(
        service.login({ email: "ana@example.com", password: "errada", rememberMe: false }),
      ).rejects.toMatchObject({ message: "INVALID_CREDENTIALS" });
    });

    it("bloqueia login por 15min após 5 tentativas inválidas (STORY-03)", async () => {
      const { service } = createService({
        attemptsResult: {
          data: { failed_count: 5, locked_until: new Date(Date.now() + 60_000).toISOString() },
          error: null,
        },
      });

      await expect(
        service.login({ email: "ana@example.com", password: "x", rememberMe: false }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("logout", () => {
    it("revoga a sessão via admin.signOut", async () => {
      const { service, supabaseAdmin } = createService();

      await service.logout("access-token");

      expect(supabaseAdmin.auth.admin.signOut).toHaveBeenCalledWith("access-token", "global");
    });
  });

  describe("refresh", () => {
    it("renova sessão com refresh token válido", async () => {
      const { service } = createService();

      const session = await service.refresh("refresh-token", true);

      expect(session.rememberMe).toBe(true);
    });

    it("lança 401 quando o refresh token é inválido", async () => {
      const supabase = {
        auth: {
          refreshSession: jest.fn().mockResolvedValue({ data: { session: null }, error: { message: "invalid" } }),
        },
      };
      const service = new AuthService(
        supabase as never,
        supabase as never,
        { log: jest.fn() } as unknown as AuditService,
      );

      await expect(service.refresh("invalid", false)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("recoverPassword", () => {
    it("sempre resolve, mesmo quando o e-mail não existe (anti-enumeração)", async () => {
      const { service, supabase } = createService();
      supabase.auth.resetPasswordForEmail = jest.fn().mockRejectedValue(new Error("not found"));

      await expect(service.recoverPassword({ email: "inexistente@example.com" })).resolves.toBeUndefined();
    });
  });

  describe("resetPassword", () => {
    it("redefine a senha com um token de recuperação válido (STORY-05)", async () => {
      const { service } = createService();

      await expect(
        service.resetPassword({ token: "tok-valido", password: "abc12!" }),
      ).resolves.toBeUndefined();
    });

    it("lança 401 quando o token é inválido/expirado", async () => {
      const { service, supabase } = createService();
      supabase.auth.verifyOtp = jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: { message: "expirado" } });

      await expect(
        service.resetPassword({ token: "tok-invalido", password: "abc12!" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("lança 500 quando updateUser falha após um token válido", async () => {
      const { service, supabase } = createService();
      supabase.auth.updateUser = jest.fn().mockResolvedValue({ error: { message: "falhou" } });

      await expect(
        service.resetPassword({ token: "tok-valido", password: "abc12!" }),
      ).rejects.toThrow("falhou");
    });
  });
});
