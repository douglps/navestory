import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { CategoriesController } from "./categories.controller";
import type { CategoriesService } from "./categories.service";

describe("CategoriesController", () => {
  function createController(overrides?: Partial<CategoriesService>) {
    const categoriesService = {
      findAll: jest.fn().mockResolvedValue({ default: [], custom: [] }),
      create: jest.fn().mockResolvedValue({ id: "c1" }),
      remove: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as unknown as CategoriesService;
    return {
      controller: new CategoriesController(categoriesService),
      categoriesService,
    };
  }

  const req = {
    headers: { authorization: "Bearer token-123" },
    cookies: {},
  } as Request;

  it("findAll lista categorias do usuário", async () => {
    const { controller, categoriesService } = createController();

    const result = await controller.findAll(req, "u1");

    expect(categoriesService.findAll).toHaveBeenCalledWith("token-123", "u1");
    expect(result.data).toEqual({ default: [], custom: [] });
  });

  it("create cria a categoria", async () => {
    const { controller, categoriesService } = createController();

    const result = await controller.create(req, "u1", {
      value: "fuel_premium",
      label: "X",
    });

    expect(categoriesService.create).toHaveBeenCalledWith("token-123", "u1", {
      value: "fuel_premium",
      label: "X",
    });
    expect(result.data).toEqual({ id: "c1" });
  });

  it("remove remove a categoria", async () => {
    const { controller, categoriesService } = createController();

    await controller.remove(req, "u1", "c1");

    expect(categoriesService.remove).toHaveBeenCalledWith(
      "token-123",
      "u1",
      "c1",
    );
  });

  it("lança 401 quando não há token disponível", async () => {
    const { controller } = createController();
    const reqSemToken = { headers: {}, cookies: {} } as unknown as Request;

    await expect(controller.findAll(reqSemToken, "u1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("usa o cookie de sessão quando não há header Authorization", async () => {
    const { controller, categoriesService } = createController();
    const reqComCookie = {
      headers: {},
      cookies: { navestory_access_token: "cookie-token" },
    } as unknown as Request;

    await controller.findAll(reqComCookie, "u1");

    expect(categoriesService.findAll).toHaveBeenCalledWith(
      "cookie-token",
      "u1",
    );
  });
});
