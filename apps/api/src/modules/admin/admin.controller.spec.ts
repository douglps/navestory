import { AdminController } from "./admin.controller";
import type { AdminService } from "./admin.service";

describe("AdminController", () => {
  function createController(overrides?: Partial<AdminService>) {
    const adminService = {
      listUsers: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } }),
      listAuditLogs: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } }),
      deleteUser: jest.fn().mockResolvedValue(undefined),
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

    await controller.deleteUser("target-user", "admin-user");

    expect(adminService.deleteUser).toHaveBeenCalledWith("target-user", "admin-user");
  });
});
