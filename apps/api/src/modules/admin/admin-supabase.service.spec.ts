import { AdminSupabaseService } from "./admin-supabase.service";

describe("AdminSupabaseService", () => {
  it("listUsers retorna usuários e total (RF-06)", async () => {
    const client = {
      auth: {
        admin: {
          listUsers: jest
            .fn()
            .mockResolvedValue({ data: { users: [{ id: "u1" }], total: 1 }, error: null }),
        },
      },
    };
    const service = new AdminSupabaseService(client as never);

    const result = await service.listUsers(1, 20);

    expect(result).toEqual({ users: [{ id: "u1" }], total: 1 });
  });

  it("listUsers usa users.length como total quando a API não retorna total", async () => {
    const client = {
      auth: {
        admin: {
          listUsers: jest
            .fn()
            .mockResolvedValue({ data: { users: [{ id: "u1" }, { id: "u2" }] }, error: null }),
        },
      },
    };
    const service = new AdminSupabaseService(client as never);

    const result = await service.listUsers(1, 20);

    expect(result.total).toBe(2);
  });

  it("listUsers propaga erro quando a chamada falha", async () => {
    const client = {
      auth: { admin: { listUsers: jest.fn().mockResolvedValue({ data: null, error: new Error("falhou") }) } },
    };
    const service = new AdminSupabaseService(client as never);

    await expect(service.listUsers(1, 20)).rejects.toThrow("falhou");
  });

  it("listAuditLogs aplica filtros e paginação (RF-07)", async () => {
    const query: Record<string, unknown> = {};
    query.select = jest.fn().mockReturnValue(query);
    query.order = jest.fn().mockReturnValue(query);
    query.eq = jest.fn().mockReturnValue(query);
    query.gte = jest.fn().mockReturnValue(query);
    query.lte = jest.fn().mockReturnValue(query);
    query.range = jest.fn().mockResolvedValue({ data: [{ id: "log-1" }], error: null, count: 1 });
    const client = { from: jest.fn().mockReturnValue(query) };
    const service = new AdminSupabaseService(client as never);

    const result = await service.listAuditLogs({
      userId: "u1",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-12-31T00:00:00.000Z",
      page: 1,
      limit: 20,
    });

    expect(query.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(query.gte).toHaveBeenCalled();
    expect(query.lte).toHaveBeenCalled();
    expect(result).toEqual({ data: [{ id: "log-1" }], total: 1 });
  });

  it("listAuditLogs sem filtros não aplica eq/gte/lte", async () => {
    const query: Record<string, unknown> = {};
    query.select = jest.fn().mockReturnValue(query);
    query.order = jest.fn().mockReturnValue(query);
    query.eq = jest.fn().mockReturnValue(query);
    query.gte = jest.fn().mockReturnValue(query);
    query.lte = jest.fn().mockReturnValue(query);
    query.range = jest.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    const client = { from: jest.fn().mockReturnValue(query) };
    const service = new AdminSupabaseService(client as never);

    await service.listAuditLogs({ page: 1, limit: 20 });

    expect(query.eq).not.toHaveBeenCalled();
    expect(query.gte).not.toHaveBeenCalled();
    expect(query.lte).not.toHaveBeenCalled();
  });

  it("listAuditLogs propaga erro quando a query falha", async () => {
    const query: Record<string, unknown> = {};
    query.select = jest.fn().mockReturnValue(query);
    query.order = jest.fn().mockReturnValue(query);
    query.range = jest.fn().mockResolvedValue({ data: null, error: new Error("falhou"), count: null });
    const client = { from: jest.fn().mockReturnValue(query) };
    const service = new AdminSupabaseService(client as never);

    await expect(
      service.listAuditLogs({ page: 1, limit: 20 }),
    ).rejects.toThrow("falhou");
  });

  it("deleteUser exclui via admin API (RF-08)", async () => {
    const deleteUser = jest.fn().mockResolvedValue({ error: null });
    const client = { auth: { admin: { deleteUser } } };
    const service = new AdminSupabaseService(client as never);

    await service.deleteUser("u1");

    expect(deleteUser).toHaveBeenCalledWith("u1");
  });

  it("deleteUser propaga erro quando a exclusão falha", async () => {
    const client = {
      auth: { admin: { deleteUser: jest.fn().mockResolvedValue({ error: new Error("falhou") }) } },
    };
    const service = new AdminSupabaseService(client as never);

    await expect(service.deleteUser("u1")).rejects.toThrow("falhou");
  });
});
