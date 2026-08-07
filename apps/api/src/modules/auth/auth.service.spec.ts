import { ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { AuditService } from "../../shared/audit/audit.service";
import { AuthService } from "./auth.service";

function createConfigService(overrides?: Record<string, string>): ConfigService {
  const values: Record<string, string> = { WEB_APP_URL: "http://localhost:3000", ...overrides };
  return {
    getOrThrow: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

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

    const configService = createConfigService();

    const service = new AuthService(
      supabase as never,
      supabaseAdmin as never,
      auditService,
      configService,
    );

    return { service, supabase, supabaseAdmin, auditService, configService };
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

    it("tolera lag entre o INSERT da trigger e a leitura via PostgREST (retry encontra o profile na 2ª tentativa)", async () => {
      const { service, supabaseAdmin } = createService();
      const profilesBuilder = supabaseAdmin.from("profiles") as ReturnType<
        typeof createQueryBuilder
      >;
      (profilesBuilder.maybeSingle as jest.Mock)
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { id: "user-1" }, error: null });

      const session = await service.register({
        name: "Ana",
        email: "ana@example.com",
        password: "abc12!",
        profile_type: "autonomous",
      });

      expect(session.accessToken).toBe("access-token");
      expect(profilesBuilder.maybeSingle).toHaveBeenCalledTimes(2);
    });

    it("reporta o erro real e desiste sem retry quando a consulta de profile falha (ex: credencial inválida)", async () => {
      const { service, supabaseAdmin } = createService({
        profilesResult: { data: null, error: { message: "JWT invalid" } },
      });
      const profilesBuilder = supabaseAdmin.from("profiles") as ReturnType<
        typeof createQueryBuilder
      >;

      await expect(
        service.register({ name: "Ana", email: "ana@example.com", password: "abc12!", profile_type: "autonomous" }),
      ).rejects.toThrow("Falha ao consultar perfil da conta: JWT invalid");
      expect(profilesBuilder.maybeSingle).toHaveBeenCalledTimes(1);
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

    // valida S4
    it("EC-09: credenciais inválidas incrementam failed_count em auth_login_attempts (S4)", async () => {
      const { service, supabaseAdmin } = createService({
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { session: null },
          error: { message: "Invalid login credentials" },
        }),
      });

      await expect(
        service.login({ email: "ana@example.com", password: "errada", rememberMe: false }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      // supabaseAdmin.from("auth_login_attempts") retorna o mesmo attemptsBuilder
      const attemptsBuilder = (supabaseAdmin as unknown as { from: jest.Mock }).from(
        "auth_login_attempts",
      ) as ReturnType<typeof createQueryBuilder>;
      // valida S4: upsert com failed_count = currentCount(0) + 1 = 1
      expect(attemptsBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ email: "ana@example.com", failed_count: 1 }),
      );
    });

    // valida S4
    it("EC-10: login bem-sucedido zera o failed_count em auth_login_attempts (S4)", async () => {
      const { service, supabaseAdmin } = createService();

      await service.login({ email: "ana@example.com", password: "abc12!", rememberMe: false });

      const attemptsBuilder = (supabaseAdmin as unknown as { from: jest.Mock }).from(
        "auth_login_attempts",
      ) as ReturnType<typeof createQueryBuilder>;
      // valida S4: resetLoginAttempts usa delete + eq no email
      expect(attemptsBuilder.delete).toHaveBeenCalled();
      expect(attemptsBuilder.eq).toHaveBeenCalledWith("email", "ana@example.com");
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
        createConfigService(),
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

    it("envia redirectTo apontando para a página de reset do app (WEB_APP_URL)", async () => {
      const { service, supabase } = createService();

      await service.recoverPassword({ email: "ana@example.com" });

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith("ana@example.com", {
        redirectTo: "http://localhost:3000/reset-password",
      });
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
