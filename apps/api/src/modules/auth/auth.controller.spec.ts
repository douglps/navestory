import type { Response } from "express";
import { AuthController } from "./auth.controller";
import type { AuthService } from "./auth.service";

function createResponseMock(): Response {
  const res: Partial<Response> = {
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  };
  return res as Response;
}

describe("AuthController", () => {
  const session = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresIn: 3600,
    rememberMe: false,
  };

  function createController(authServiceOverrides?: Partial<AuthService>) {
    const authService = {
      register: jest.fn().mockResolvedValue(session),
      login: jest.fn().mockResolvedValue(session),
      logout: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(session),
      recoverPassword: jest.fn().mockResolvedValue(undefined),
      resetPassword: jest.fn().mockResolvedValue(undefined),
      ...authServiceOverrides,
    } as unknown as AuthService;

    return { controller: new AuthController(authService), authService };
  }

  it("register seta cookies httpOnly de sessão", async () => {
    const { controller } = createController();
    const res = createResponseMock();

    await controller.register(
      { name: "Ana", email: "ana@example.com", password: "abc12!", profile_type: "autonomous" },
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      "nave_access_token",
      "access-token",
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("login retorna mensagem de sucesso e seta cookies", async () => {
    const { controller } = createController();
    const res = createResponseMock();

    const result = await controller.login(
      { email: "ana@example.com", password: "abc12!", rememberMe: false },
      res,
    );

    expect(result.data.message).toBe("Login realizado com sucesso");
    expect(res.cookie).toHaveBeenCalledTimes(3);
  });

  it("logout revoga a sessão e limpa os cookies", async () => {
    const { controller, authService } = createController();
    const res = createResponseMock();
    const req = { cookies: { nave_access_token: "access-token" } };

    await controller.logout(req as never, res);

    expect(authService.logout).toHaveBeenCalledWith("access-token");
    expect(res.clearCookie).toHaveBeenCalledWith("nave_access_token", { path: "/" });
  });

  it("logout não chama o service quando não há cookie de sessão", async () => {
    const { controller, authService } = createController();
    const res = createResponseMock();
    const req = { cookies: {} };

    await controller.logout(req as never, res);

    expect(authService.logout).not.toHaveBeenCalled();
  });

  it("refresh renova a sessão a partir do refresh token no cookie", async () => {
    const { controller, authService } = createController();
    const res = createResponseMock();
    const req = { cookies: { nave_refresh_token: "refresh-token", nave_remember_me: "true" } };

    const result = await controller.refresh(req as never, res);

    expect(authService.refresh).toHaveBeenCalledWith("refresh-token", true);
    expect(result.data.message).toBe("Sessão renovada");
  });

  it("seta maxAge estendido nos cookies quando rememberMe é true", async () => {
    const { controller } = createController({
      login: jest.fn().mockResolvedValue({ ...session, rememberMe: true }),
    });
    const res = createResponseMock();

    await controller.login({ email: "ana@example.com", password: "abc12!", rememberMe: true }, res);

    expect(res.cookie).toHaveBeenCalledWith(
      "nave_refresh_token",
      "refresh-token",
      expect.objectContaining({ maxAge: expect.any(Number) }),
    );
  });

  it("refresh retorna 401 e limpa cookies quando não há refresh token", async () => {
    const { controller, authService } = createController();
    const res = createResponseMock();
    const req = { cookies: {} };

    const result = await controller.refresh(req as never, res);

    expect(authService.refresh).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(result.data.message).toBe("Sessão expirada");
  });

  it("recover-password sempre retorna mensagem genérica (anti-enumeração)", async () => {
    const { controller } = createController();

    const result = await controller.recoverPassword({ email: "qualquer@example.com" });

    expect(result.data.message).toMatch(/instruções/);
  });

  it("reset-password redefine a senha com sucesso", async () => {
    const { controller, authService } = createController();

    const result = await controller.resetPassword({ token: "tok", password: "abc12!" });

    expect(authService.resetPassword).toHaveBeenCalledWith({ token: "tok", password: "abc12!" });
    expect(result.data.message).toBe("Senha redefinida com sucesso");
  });
});
