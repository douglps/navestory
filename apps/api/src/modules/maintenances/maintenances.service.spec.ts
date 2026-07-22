import { ConflictException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { AuditService } from "../../shared/audit/audit.service";
import type { ExpensesService } from "../expenses/expenses.service";
import { MaintenancesService } from "./maintenances.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("MaintenancesService", () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `stub-${key}`),
  } as unknown as ConfigService;
  const supabaseAdmin = {} as never;

  function buildTerminalBuilder(resultOrQueue: unknown) {
    const queue = Array.isArray(resultOrQueue) ? [...resultOrQueue] : undefined;
    const resolveNext = () => (queue ? (queue.length > 1 ? queue.shift() : queue[0]) : resultOrQueue);

    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.insert = jest.fn().mockReturnValue(builder);
    builder.update = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.neq = jest.fn().mockReturnValue(builder);
    builder.not = jest.fn().mockReturnValue(builder);
    builder.is = jest.fn().mockReturnValue(builder);
    builder.order = jest.fn().mockReturnValue(builder);
    builder.limit = jest.fn().mockReturnValue(builder);
    builder.range = jest.fn().mockImplementation(() => Promise.resolve(resolveNext()));
    builder.single = jest.fn().mockImplementation(() => Promise.resolve(resolveNext()));
    builder.maybeSingle = jest.fn().mockImplementation(() => Promise.resolve(resolveNext()));
    builder.then = ((resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(resolveNext()).then(resolve, reject)) as unknown;
    return builder;
  }

  function mockClient(resultsByTable: Record<string, unknown>) {
    const results = new Map(Object.entries(resultsByTable));
    const builders = new Map<string, Record<string, unknown>>();
    for (const [table, result] of results) {
      builders.set(table, buildTerminalBuilder(result));
    }
    const client = {
      from: jest.fn((table: string) => {
        if (!builders.has(table)) {
          builders.set(table, buildTerminalBuilder(results.get(table)));
        }
        return builders.get(table);
      }),
    };
    (createUserScopedClient as jest.Mock).mockReturnValue(client);
    return { client, builders };
  }

  function createService(auditLog = jest.fn(), expensesOverrides?: Partial<ExpensesService>) {
    const auditService = { log: auditLog } as unknown as AuditService;
    const expensesService = {
      createFromSource: jest.fn().mockResolvedValue({ id: "e1" }),
      softDeleteBySource: jest.fn().mockResolvedValue(undefined),
      ...expensesOverrides,
    } as unknown as ExpensesService;
    const preferencesService = { findOne: jest.fn().mockResolvedValue({ timezone: null }) };
    return {
      service: new MaintenancesService(supabaseAdmin, configService, auditService, expensesService, preferencesService as never),
      expensesService,
    };
  }

  const createDto = {
    vehicle_id: "veh1",
    description: "Troca de óleo",
    scheduled_date: "2026-08-01",
  };

  it("create persiste a manutenção com status scheduled quando o veículo pertence ao usuário (RF-01, RF-03)", async () => {
    mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      maintenances: [
        { data: { id: "m1", vehicle_id: "veh1", status: "scheduled", odometer_km: null }, error: null },
      ],
    });
    const { service } = createService();

    const maintenance = await service.create("token", "u1", createDto as never);

    expect(maintenance).toMatchObject({ id: "m1", status: "scheduled" });
  });

  it("create ignora status enviado no payload (RF-03)", async () => {
    const { builders } = mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      maintenances: [
        { data: { id: "m1", vehicle_id: "veh1", status: "scheduled", odometer_km: null }, error: null },
      ],
    });
    const { service } = createService();

    await service.create("token", "u1", { ...createDto, status: "completed" } as never);

    const insertCall = (builders.get("maintenances")!.insert as jest.Mock).mock.calls[0][0];
    expect(insertCall.status).toBeUndefined();
  });

  it("create lança 404 quando vehicle_id não pertence ao usuário (RF-13)", async () => {
    mockClient({ vehicles: { data: null, error: null } });
    const { service } = createService();

    await expect(service.create("token", "u1", createDto as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("create com odometer_km menor que o máximo já registrado retorna odometer_warning (RF-09)", async () => {
    mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      maintenances: [
        { data: { id: "m1", vehicle_id: "veh1", status: "scheduled", odometer_km: 50000 }, error: null },
        { data: { odometer_km: 80000 }, error: null },
      ],
    });
    const { service } = createService();

    const maintenance = await service.create(
      "token",
      "u1",
      { ...createDto, odometer_km: 50000 } as never,
    );

    expect(maintenance).toMatchObject({ odometer_warning: true, odometer_previous_max_km: 80000 });
  });

  it("create lança 404 quando o insert falha", async () => {
    mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      maintenances: { data: null, error: { message: "boom" } },
    });
    const { service } = createService();

    await expect(service.create("token", "u1", createDto as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("create com odometer_km sem manutenção anterior registrada não gera warning (RF-09)", async () => {
    mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      maintenances: [
        { data: { id: "m1", vehicle_id: "veh1", status: "scheduled", odometer_km: 50000 }, error: null },
        { data: null, error: null },
      ],
    });
    const { service } = createService();

    const maintenance = await service.create(
      "token",
      "u1",
      { ...createDto, odometer_km: 50000 } as never,
    );

    expect(maintenance.odometer_warning).toBeUndefined();
  });

  it("create com odometer_km maior ou igual ao máximo não gera warning (RF-09)", async () => {
    mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      maintenances: [
        { data: { id: "m1", vehicle_id: "veh1", status: "scheduled", odometer_km: 90000 }, error: null },
        { data: { odometer_km: 80000 }, error: null },
      ],
    });
    const { service } = createService();

    const maintenance = await service.create(
      "token",
      "u1",
      { ...createDto, odometer_km: 90000 } as never,
    );

    expect(maintenance.odometer_warning).toBeUndefined();
  });

  it("create tolera falha inesperada ao verificar sequência de odômetro (RF-09)", async () => {
    const { builders } = mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      maintenances: [
        { data: { id: "m1", vehicle_id: "veh1", status: "scheduled", odometer_km: 50000 }, error: null },
      ],
    });
    const { service } = createService();
    const maintenancesBuilder = builders.get("maintenances")!;
    (maintenancesBuilder.maybeSingle as jest.Mock).mockImplementationOnce(() => {
      throw new Error("falha inesperada");
    });

    const maintenance = await service.create(
      "token",
      "u1",
      { ...createDto, odometer_km: 50000 } as never,
    );

    expect(maintenance.odometer_warning).toBeUndefined();
  });

  describe("findAll (RF-04)", () => {
    it("lista manutenções paginadas com filtros de veículo e status", async () => {
      const { builders } = mockClient({
        maintenances: { data: [{ id: "m1" }], error: null, count: 1 },
      });
      const { service } = createService();

      const result = await service.findAll("token", "u1", {
        page: 1,
        limit: 20,
        vehicle_id: "veh1",
        status: "scheduled",
      } as never);

      expect(builders.get("maintenances")!.eq).toHaveBeenCalledWith("vehicle_id", "veh1");
      expect(builders.get("maintenances")!.eq).toHaveBeenCalledWith("status", "scheduled");
      expect(result).toEqual({
        data: [{ id: "m1" }],
        meta: { total: 1, page: 1, limit: 20, has_next: false },
      });
    });

    it("lança 404 quando a query falha", async () => {
      mockClient({ maintenances: { data: null, error: { message: "boom" }, count: 0 } });
      const { service } = createService();

      await expect(
        service.findAll("token", "u1", { page: 1, limit: 20 } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it("findOne lança 404 quando a manutenção não existe ou não pertence ao usuário (RF-05)", async () => {
    mockClient({ maintenances: { data: null, error: null } });
    const { service } = createService();

    await expect(service.findOne("token", "u1", "m1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("update aplica transição válida scheduled → in_progress (RF-07, R7)", async () => {
    const { builders } = mockClient({
      maintenances: [
        {
          data: { id: "m1", vehicle_id: "veh1", status: "scheduled", odometer_km: null, cost: null },
          error: null,
        },
        { data: { id: "m1", status: "in_progress", vehicle_id: "veh1", odometer_km: null }, error: null },
      ],
    });
    const { service } = createService();

    await service.update("token", "u1", "m1", { status: "in_progress" } as never);

    const updateCall = (builders.get("maintenances")!.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.status).toBe("in_progress");
  });

  it("update lança 409 para transição inválida completed → in_progress (RF-07, R7)", async () => {
    mockClient({
      maintenances: {
        data: { id: "m1", vehicle_id: "veh1", status: "completed", odometer_km: 50000, cost: null },
        error: null,
      },
    });
    const { service } = createService();

    await expect(
      service.update("token", "u1", "m1", { status: "in_progress" } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("update lança 409 para transição ao mesmo status (RF-06)", async () => {
    mockClient({
      maintenances: {
        data: { id: "m1", vehicle_id: "veh1", status: "scheduled", odometer_km: null, cost: null },
        error: null,
      },
    });
    const { service } = createService();

    await expect(
      service.update("token", "u1", "m1", { status: "scheduled" } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("update lança 422 ao concluir sem odometer_km (RF-08, R-ODO-03)", async () => {
    mockClient({
      maintenances: {
        data: { id: "m1", vehicle_id: "veh1", status: "scheduled", odometer_km: null, cost: null },
        error: null,
      },
    });
    const { service } = createService();

    await expect(
      service.update("token", "u1", "m1", { status: "completed" } as never),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("update para completed com cost cria expense vinculada (RF-10, R-LED-02)", async () => {
    mockClient({
      maintenances: [
        {
          data: {
            id: "m1",
            vehicle_id: "veh1",
            status: "scheduled",
            odometer_km: 50000,
            cost: null,
            scheduled_date: "2026-08-01",
          },
          error: null,
        },
        {
          data: {
            id: "m1",
            vehicle_id: "veh1",
            status: "completed",
            odometer_km: 50000,
            cost: 350,
            scheduled_date: "2026-08-01",
            completion_date: "2026-08-02",
            description: "Troca de óleo",
          },
          error: null,
        },
      ],
    });
    const { service, expensesService } = createService();

    await service.update(
      "token",
      "u1",
      "m1",
      { status: "completed", odometer_km: 50000, cost: 350 } as never,
    );

    expect(expensesService.createFromSource).toHaveBeenCalledWith("token", "u1", {
      source_type: "maintenance",
      source_id: "m1",
      vehicle_id: "veh1",
      category: "maintenance",
      amount: 350,
      date: "2026-08-02",
      description: "Troca de óleo",
    });
  });

  it("update para cancelled soft-deleta a expense vinculada (RF-11, R-LED-03)", async () => {
    mockClient({
      maintenances: [
        {
          data: { id: "m1", vehicle_id: "veh1", status: "scheduled", odometer_km: null, cost: null },
          error: null,
        },
        { data: { id: "m1", vehicle_id: "veh1", status: "cancelled", odometer_km: null }, error: null },
      ],
    });
    const { service, expensesService } = createService();

    await service.update("token", "u1", "m1", { status: "cancelled" } as never);

    expect(expensesService.softDeleteBySource).toHaveBeenCalledWith("token", "u1", "maintenance", "m1");
  });

  it("update sem campo status não aciona validação de transição (RF-07)", async () => {
    const { builders } = mockClient({
      maintenances: [
        {
          data: { id: "m1", vehicle_id: "veh1", status: "completed", odometer_km: 50000, cost: null },
          error: null,
        },
        {
          data: { id: "m1", vehicle_id: "veh1", status: "completed", description: "Nova descrição" },
          error: null,
        },
      ],
    });
    const { service } = createService();

    await service.update("token", "u1", "m1", { description: "Nova descrição" } as never);

    const updateCall = (builders.get("maintenances")!.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.status).toBeUndefined();
  });

  it("update transição rejeitada não grava audit log (RF-14, SPEC-20260603-002 RF-10)", async () => {
    mockClient({
      maintenances: {
        data: { id: "m1", vehicle_id: "veh1", status: "completed", odometer_km: 50000, cost: null },
        error: null,
      },
    });
    const auditLog = jest.fn();
    const { service } = createService(auditLog);

    await expect(
      service.update("token", "u1", "m1", { status: "in_progress" } as never),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(auditLog).not.toHaveBeenCalled();
  });

  it("remove soft-deleta a manutenção (RF-12, R5)", async () => {
    const { builders } = mockClient({
      maintenances: { data: { id: "m1", vehicle_id: "veh1", status: "scheduled" }, error: null },
    });
    const { service } = createService();

    await service.remove("token", "u1", "m1");

    const updateCall = (builders.get("maintenances")!.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.deleted_at).toBeDefined();
  });

  it("remove soft-deleta a expense vinculada (RF-12, R-HUB-01)", async () => {
    mockClient({
      maintenances: { data: { id: "m1", vehicle_id: "veh1", status: "scheduled" }, error: null },
    });
    const { service, expensesService } = createService();

    await service.remove("token", "u1", "m1");

    expect(expensesService.softDeleteBySource).toHaveBeenCalledWith("token", "u1", "maintenance", "m1");
  });

  it("update lança 404 quando o update falha", async () => {
    mockClient({
      maintenances: [
        {
          data: { id: "m1", vehicle_id: "veh1", status: "scheduled", odometer_km: null, cost: null },
          error: null,
        },
        { data: null, error: { message: "boom" } },
      ],
    });
    const { service } = createService();

    await expect(
      service.update("token", "u1", "m1", { description: "Nova descrição" } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("remove lança 404 quando o soft-delete falha", async () => {
    mockClient({
      maintenances: [
        { data: { id: "m1", vehicle_id: "veh1", status: "scheduled" }, error: null },
        { error: { message: "boom" } },
      ],
    });
    const { service } = createService();

    await expect(service.remove("token", "u1", "m1")).rejects.toBeInstanceOf(NotFoundException);
  });
});
