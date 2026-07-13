import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { UsersController } from "./users.controller";
import type { UsersService } from "./users.service";

describe("UsersController", () => {
  function createController(overrides?: Partial<UsersService>) {
    const usersService = {
      getProfile: jest.fn().mockResolvedValue({ id: "u1", name: "Ana" }),
      updateProfile: jest.fn().mockResolvedValue({ id: "u1", name: "Ana Atualizada" }),
      deleteAccount: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as unknown as UsersService;
    return { controller: new UsersController(usersService), usersService };
  }

  it("getMe extrai o token do header Authorization e retorna o perfil", async () => {
    const { controller, usersService } = createController();
    const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as Request;

    const result = await controller.getMe(req, "u1");

    expect(usersService.getProfile).toHaveBeenCalledWith("token-123", "u1");
    expect(result.data).toEqual({ id: "u1", name: "Ana" });
  });

  it("getMe usa o cookie de sessão quando não há header Authorization", async () => {
    const { controller, usersService } = createController();
    const req = { headers: {}, cookies: { nave_access_token: "cookie-token" } } as unknown as Request;

    await controller.getMe(req, "u1");

    expect(usersService.getProfile).toHaveBeenCalledWith("cookie-token", "u1");
  });

  it("getMe lança 401 quando não há token disponível", async () => {
    const { controller } = createController();
    const req = { headers: {}, cookies: {} } as unknown as Request;

    await expect(controller.getMe(req, "u1")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("updateMe atualiza o perfil", async () => {
    const { controller, usersService } = createController();
    const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as Request;

    const result = await controller.updateMe(req, "u1", { name: "Ana Atualizada" });

    expect(usersService.updateProfile).toHaveBeenCalledWith("token-123", "u1", {
      name: "Ana Atualizada",
    });
    expect(result.data.name).toBe("Ana Atualizada");
  });

  it("deleteMe exclui a conta do usuário autenticado (RF-01)", async () => {
    const { controller, usersService } = createController();

    await controller.deleteMe("u1", { confirm: true });

    expect(usersService.deleteAccount).toHaveBeenCalledWith("u1");
  });
});
