import { AdminSupabaseService } from "./admin-supabase.service";

describe("AdminSupabaseService", () => {
  function createProfilesQuery(
    profiles: Array<{ id: string; name: string; deleted_at: string | null }>,
  ) {
    const query: Record<string, unknown> = {};
    query.select = jest.fn().mockReturnValue(query);
    query.in = jest.fn().mockResolvedValue({ data: profiles });
    return query;
  }

  it("listUsers enriquece com name/deleted_at de profiles (RF-10)", async () => {
    const gotrueUser = {
      id: "u1",
      email: "u1@navestory.app",
      app_metadata: { role: "admin" },
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const profilesQuery = createProfilesQuery([
      { id: "u1", name: "Fulano", deleted_at: null },
    ]);
    const client = {
      auth: {
        admin: {
          listUsers: jest
            .fn()
            .mockResolvedValue({
              data: { users: [gotrueUser], total: 1 },
              error: null,
            }),
        },
      },
      from: jest.fn().mockReturnValue(profilesQuery),
    };
    const service = new AdminSupabaseService(client as never);

    const result = await service.listUsers(1, 20);

    expect(client.from).toHaveBeenCalledWith("profiles");
    expect(profilesQuery.in).toHaveBeenCalledWith("id", ["u1"]);
    expect(result).toEqual({
      users: [
        {
          id: "u1",
          email: "u1@navestory.app",
          name: "Fulano",
          role: "admin",
          deleted_at: null,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
    });
  });

  it("listUsers usa users.length como total quando a API não retorna total", async () => {
    const users = [
      {
        id: "u1",
        email: "u1@navestory.app",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "u2",
        email: "u2@navestory.app",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    const profilesQuery = createProfilesQuery([]);
    const client = {
      auth: {
        admin: {
          listUsers: jest
            .fn()
            .mockResolvedValue({ data: { users }, error: null }),
        },
      },
      from: jest.fn().mockReturnValue(profilesQuery),
    };
    const service = new AdminSupabaseService(client as never);

    const result = await service.listUsers(1, 20);

    expect(result.total).toBe(2);
  });

  it("listUsers propaga erro quando a chamada falha", async () => {
    const client = {
      auth: {
        admin: {
          listUsers: jest
            .fn()
            .mockResolvedValue({ data: null, error: new Error("falhou") }),
        },
      },
    };
    const service = new AdminSupabaseService(client as never);

    await expect(service.listUsers(1, 20)).rejects.toThrow("falhou");
  });

  it("listUsers não consulta profiles quando não há usuários", async () => {
    const client = {
      auth: {
        admin: {
          listUsers: jest
            .fn()
            .mockResolvedValue({ data: { users: [], total: 0 }, error: null }),
        },
      },
      from: jest.fn(),
    };
    const service = new AdminSupabaseService(client as never);

    const result = await service.listUsers(1, 20);

    expect(client.from).not.toHaveBeenCalled();
    expect(result).toEqual({ users: [], total: 0 });
  });

  it("listAuditLogs aplica filtros e paginação (RF-07)", async () => {
    const query: Record<string, unknown> = {};
    query.select = jest.fn().mockReturnValue(query);
    query.order = jest.fn().mockReturnValue(query);
    query.eq = jest.fn().mockReturnValue(query);
    query.gte = jest.fn().mockReturnValue(query);
    query.lte = jest.fn().mockReturnValue(query);
    query.range = jest
      .fn()
      .mockResolvedValue({ data: [{ id: "log-1" }], error: null, count: 1 });
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
    query.range = jest
      .fn()
      .mockResolvedValue({ data: [], error: null, count: 0 });
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
    query.range = jest
      .fn()
      .mockResolvedValue({
        data: null,
        error: new Error("falhou"),
        count: null,
      });
    const client = { from: jest.fn().mockReturnValue(query) };
    const service = new AdminSupabaseService(client as never);

    await expect(service.listAuditLogs({ page: 1, limit: 20 })).rejects.toThrow(
      "falhou",
    );
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
      auth: {
        admin: {
          deleteUser: jest
            .fn()
            .mockResolvedValue({ error: new Error("falhou") }),
        },
      },
    };
    const service = new AdminSupabaseService(client as never);

    await expect(service.deleteUser("u1")).rejects.toThrow("falhou");
  });

  it("getUserById retorna o usuário quando encontrado (RF-03)", async () => {
    const getUserById = jest
      .fn()
      .mockResolvedValue({
        data: { user: { id: "u1", app_metadata: { role: "admin" } } },
        error: null,
      });
    const client = { auth: { admin: { getUserById } } };
    const service = new AdminSupabaseService(client as never);

    const result = await service.getUserById("u1");

    expect(getUserById).toHaveBeenCalledWith("u1");
    expect(result).toEqual({ id: "u1", app_metadata: { role: "admin" } });
  });

  it("getUserById retorna null quando o erro é 404 (RF-06)", async () => {
    const error = Object.assign(new Error("User not found"), { status: 404 });
    const getUserById = jest.fn().mockResolvedValue({ data: null, error });
    const client = { auth: { admin: { getUserById } } };
    const service = new AdminSupabaseService(client as never);

    const result = await service.getUserById("missing");

    expect(result).toBeNull();
  });

  it("getUserById propaga erro quando não é 404", async () => {
    const error = Object.assign(new Error("falhou"), { status: 500 });
    const getUserById = jest.fn().mockResolvedValue({ data: null, error });
    const client = { auth: { admin: { getUserById } } };
    const service = new AdminSupabaseService(client as never);

    await expect(service.getUserById("u1")).rejects.toThrow("falhou");
  });

  it("updateUserRole grava role em app_metadata (RF-03, S12)", async () => {
    const updateUserById = jest
      .fn()
      .mockResolvedValue({ data: { user: {} }, error: null });
    const client = { auth: { admin: { updateUserById } } };
    const service = new AdminSupabaseService(client as never);

    await service.updateUserRole("u1", "admin");

    expect(updateUserById).toHaveBeenCalledWith("u1", {
      app_metadata: { role: "admin" },
    });
  });

  it("updateUserRole com role null envia undefined (remove a chave sem sobrescrever app_metadata)", async () => {
    const updateUserById = jest
      .fn()
      .mockResolvedValue({ data: { user: {} }, error: null });
    const client = { auth: { admin: { updateUserById } } };
    const service = new AdminSupabaseService(client as never);

    await service.updateUserRole("u1", null);

    expect(updateUserById).toHaveBeenCalledWith("u1", {
      app_metadata: { role: undefined },
    });
  });

  it("updateUserRole propaga erro quando a chamada falha", async () => {
    const updateUserById = jest
      .fn()
      .mockResolvedValue({ data: null, error: new Error("falhou") });
    const client = { auth: { admin: { updateUserById } } };
    const service = new AdminSupabaseService(client as never);

    await expect(service.updateUserRole("u1", "admin")).rejects.toThrow(
      "falhou",
    );
  });
});
