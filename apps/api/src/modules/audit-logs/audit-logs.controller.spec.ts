import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { AuditLogsController } from "./audit-logs.controller";
import type { AuditLogsService } from "./audit-logs.service";

describe("AuditLogsController", () => {
  function createController(overrides?: Partial<AuditLogsService>) {
    const auditLogsService = {
      findRecent: jest.fn().mockResolvedValue([{ id: "1" }]),
      ...overrides,
    } as unknown as AuditLogsService;
    return {
      controller: new AuditLogsController(auditLogsService),
      auditLogsService,
    };
  }

  const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as Request;

  it("findRecent extrai o token e retorna o histórico do usuário", async () => {
    const { controller, auditLogsService } = createController();

    const result = await controller.findRecent(req, "u1");

    expect(auditLogsService.findRecent).toHaveBeenCalledWith("token-123", "u1");
    expect(result.data).toEqual([{ id: "1" }]);
  });

  it("lança 401 quando não há token disponível", async () => {
    const { controller } = createController();
    const reqSemToken = { headers: {}, cookies: {} } as unknown as Request;

    await expect(controller.findRecent(reqSemToken, "u1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
