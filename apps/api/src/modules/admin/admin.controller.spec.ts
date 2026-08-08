import { AdminController } from "./admin.controller";
import type { AdminService } from "./admin.service";

function createRequestMock() {
  return { ip: "127.0.0.1", headers: { "user-agent": "jest" } } as never;
}

describe("AdminController", () => {
  function createController(overrides?: Partial<AdminService>) {
    const adminService = {
      listUsers: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } }),
      listAuditLogs: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } }),
      deleteUser: jest.fn().mockResolvedValue(undefined),
      updateUserRole: jest.fn().mockResolvedValue({ data: { id: "target-user", role: "admin" } }),
      ...overrides,
    } as unknown as AdminService;
    return { controller: new AdminController(adminService), adminService };
  }

  it("listUsers valida query e delega para o service (RF-06)", async () => {
    const { controller, adminService } = createController();

    await controller.listUsers({ page: "2", limit: "10" });

    expect(adminService.listUsers).toHaveBeenCalledWith({ page: 2, limit: 10 });
  });

  it("listAuditLogs valida query e delega para o service (RF-07)", async () => {
    const { controller, adminService } = createController();

    await controller.listAuditLogs({ user_id: "550e8400-e29b-41d4-a716-446655440000" });

    expect(adminService.listAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "550e8400-e29b-41d4-a716-446655440000" }),
    );
  });

  it("deleteUser exclui a conta de um terceiro (RF-08, LGPD)", async () => {
    const { controller, adminService } = createController();

    await controller.deleteUser("target-user", "admin-user", createRequestMock());

    expect(adminService.deleteUser).toHaveBeenCalledWith(
      "target-user",
      "admin-user",
      expect.objectContaining({ ip: "127.0.0.1" }),
    );
  });

  it("updateUserRole delega para o service com id, adminUserId e role (RF-01)", async () => {
    const { controller, adminService } = createController();

    await controller.updateUserRole(
      "target-user",
      { role: "admin" },
      "admin-user",
      createRequestMock(),
    );

    expect(adminService.updateUserRole).toHaveBeenCalledWith(
      "target-user",
      "admin-user",
      "admin",
      expect.objectContaining({ ip: "127.0.0.1" }),
    );
  });

  it("updateUserRole aceita role null para revogação (RF-01)", async () => {
    const { controller, adminService } = createController();

    await controller.updateUserRole(
      "target-user",
      { role: null },
      "admin-user",
      createRequestMock(),
    );

    expect(adminService.updateUserRole).toHaveBeenCalledWith(
      "target-user",
      "admin-user",
      null,
      expect.objectContaining({ ip: "127.0.0.1" }),
    );
  });
});
