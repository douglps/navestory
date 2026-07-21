import { ConflictException, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { AuditService } from "../../shared/audit/audit.service";
import type { ExpensesService } from "../expenses/expenses.service";
import { FinesService } from "./fines.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("FinesService", () => {
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
    builder.is = jest.fn().mockReturnValue(builder);
    builder.order = jest.fn().mockReturnValue(builder);
    builder.single = jest.fn().mockImplementation(() => Promise.resolve(resolveNext()));
    builder.maybeSingle = jest.fn().mockImplementation(() => Promise.resolve(resolveNext()));
    builder.then = ((resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(resolveNext()).then(resolve, reject)) as unknown;
    return builder;
  }

  function mockClient(resultsByTable: Record<string, unknown>) {
    const results = new Map(Object.entries(resultsByTable));
    const builders = new Map<string, Record<string, unknown>>();
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
    return {
      service: new FinesService(supabaseAdmin, configService, auditService, expensesService),
      expensesService,
    };
  }

  const createDto = {
    vehicle_id: "veh1",
    description: "Excesso de velocidade",
    amount: 195.23,
    occurred_at: "2026-07-01",
  };

  it("create persiste a multa quando o veículo pertence ao usuário (RF-01)", async () => {
    const { builders } = mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      fines: { data: { id: "f1", status: "pending" }, error: null },
    });
    const { service } = createService();

    const fine = await service.create("token", "u1", createDto as never);

    expect(fine).toEqual({ id: "f1", status: "pending" });
    const insertCall = (builders.get("fines")!.insert as jest.Mock).mock.calls[0][0];
    expect(insertCall.user_id).toBe("u1");
  });

  it("create vincula a expense ao ledger com source_type='fine' (R-LED-02)", async () => {
    mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      fines: {
        data: {
          id: "f1",
          vehicle_id: "veh1",
          description: "Excesso de velocidade",
          amount: 195.23,
          amount_with_discount: 150.0,
          occurred_at: "2026-07-01",
          status: "pending",
        },
        error: null,
      },
    });
    const { service, expensesService } = createService();

    await service.create("token", "u1", createDto as never);

    expect(expensesService.createFromSource).toHaveBeenCalledWith("token", "u1", {
      source_type: "fine",
      source_id: "f1",
      vehicle_id: "veh1",
      category: "fine",
      amount: 150.0,
      date: "2026-07-01",
      description: "Excesso de velocidade",
    });
  });

  it("create lança 404 quando vehicle_id não pertence ao usuário (RF-01)", async () => {
    mockClient({ vehicles: { data: null, error: null } });
    const { service } = createService();

    await expect(service.create("token", "u1", createDto as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("create lança 409 quando amount_with_discount é maior que amount (Regra de Negócio)", async () => {
    mockClient({ vehicles: { data: { id: "veh1" }, error: null } });
    const { service } = createService();

    await expect(
      service.create(
        "token",
        "u1",
        { ...createDto, amount_with_discount: 500 } as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("findAll lista multas ordenadas por occurred_at desc (RF-02)", async () => {
    const { builders } = mockClient({
      fines: { data: [{ id: "f1" }, { id: "f2" }], error: null },
    });
    const { service } = createService();

    const result = await service.findAll("token", "u1");

    expect(builders.get("fines")!.order).toHaveBeenCalledWith("occurred_at", { ascending: false });
    expect(result).toHaveLength(2);
  });

  it("findAll filtra por status quando informado (RF-02)", async () => {
    const { builders } = mockClient({ fines: { data: [], error: null } });
    const { service } = createService();

    await service.findAll("token", "u1", "paid");

    expect(builders.get("fines")!.eq).toHaveBeenCalledWith("status", "paid");
  });

  it("findByVehicle lança 404 quando o veículo não pertence ao usuário (RF-02)", async () => {
    mockClient({ vehicles: { data: null, error: null } });
    const { service } = createService();

    await expect(service.findByVehicle("token", "u1", "veh1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("findOne lança 404 quando a multa não existe ou não pertence ao usuário (RF-03)", async () => {
    mockClient({ fines: { data: null, error: null } });
    const { service } = createService();

    await expect(service.findOne("token", "u1", "f1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("update aplica transição de status válida pending → paid (RF-05)", async () => {
    const { builders } = mockClient({
      fines: [
        { data: { id: "f1", status: "pending", amount: 195.23, amount_with_discount: null }, error: null },
        { data: { id: "f1", status: "paid" }, error: null },
      ],
    });
    const { service } = createService();

    await service.update("token", "u1", "f1", { status: "paid" } as never);

    const updateCall = (builders.get("fines")!.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.status).toBe("paid");
    expect(updateCall.paid_at).toBeDefined();
  });

  it("update para status=cancelled soft-deleta a expense vinculada (R-LED-03)", async () => {
    mockClient({
      fines: [
        { data: { id: "f1", status: "pending", amount: 195.23, amount_with_discount: null }, error: null },
        { data: { id: "f1", status: "cancelled" }, error: null },
      ],
    });
    const { service, expensesService } = createService();

    await service.update("token", "u1", "f1", { status: "cancelled" } as never);

    expect(expensesService.softDeleteBySource).toHaveBeenCalledWith("token", "u1", "fine", "f1");
  });

  it("update lança 409 para transição de status inválida (RF-05)", async () => {
    mockClient({
      fines: { data: { id: "f1", status: "paid", amount: 195.23, amount_with_discount: null }, error: null },
    });
    const { service } = createService();

    await expect(
      service.update("token", "u1", "f1", { status: "cancelled" } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("create lança 404 quando o insert falha", async () => {
    mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      fines: { data: null, error: { message: "boom" } },
    });
    const { service } = createService();

    await expect(service.create("token", "u1", createDto as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("findAll lança 404 quando a query falha", async () => {
    mockClient({ fines: { data: null, error: { message: "boom" } } });
    const { service } = createService();

    await expect(service.findAll("token", "u1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("findByVehicle lista multas do veículo ordenadas por occurred_at desc (RF-02)", async () => {
    const { builders } = mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      fines: { data: [{ id: "f1" }], error: null },
    });
    const { service } = createService();

    const result = await service.findByVehicle("token", "u1", "veh1");

    expect(builders.get("fines")!.eq).toHaveBeenCalledWith("vehicle_id", "veh1");
    expect(result).toEqual([{ id: "f1" }]);
  });

  it("findByVehicle lança 404 quando a query de multas falha", async () => {
    mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      fines: { data: null, error: { message: "boom" } },
    });
    const { service } = createService();

    await expect(service.findByVehicle("token", "u1", "veh1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("update lança 409 quando amount_with_discount resultante é maior que amount (Regra de Negócio)", async () => {
    mockClient({
      fines: { data: { id: "f1", status: "pending", amount: 100, amount_with_discount: null }, error: null },
    });
    const { service } = createService();

    await expect(
      service.update("token", "u1", "f1", { amount_with_discount: 500 } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("remove soft-deleta a multa (RF-06, R5)", async () => {
    const { builders } = mockClient({
      fines: { data: { id: "f1", status: "pending" }, error: null },
    });
    const { service } = createService();

    await service.remove("token", "u1", "f1");

    const updateCall = (builders.get("fines")!.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.deleted_at).toBeDefined();
  });

  it("remove soft-deleta a expense vinculada (R-HUB-01)", async () => {
    mockClient({
      fines: { data: { id: "f1", status: "pending" }, error: null },
    });
    const { service, expensesService } = createService();

    await service.remove("token", "u1", "f1");

    expect(expensesService.softDeleteBySource).toHaveBeenCalledWith("token", "u1", "fine", "f1");
  });

  it("update lança 404 quando o update falha", async () => {
    mockClient({
      fines: [
        { data: { id: "f1", status: "pending", amount: 195.23, amount_with_discount: null }, error: null },
        { data: null, error: { message: "boom" } },
      ],
    });
    const { service } = createService();

    await expect(
      service.update("token", "u1", "f1", { status: "paid" } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("remove lança 404 quando o soft-delete falha", async () => {
    mockClient({
      fines: [
        { data: { id: "f1", status: "pending" }, error: null },
        { error: { message: "boom" } },
      ],
    });
    const { service } = createService();

    await expect(service.remove("token", "u1", "f1")).rejects.toBeInstanceOf(NotFoundException);
  });

  describe("countPending (RF-07)", () => {
    it("conta multas pendentes do usuário", async () => {
      const { builders } = mockClient({ fines: { count: 3, error: null } });
      const { service } = createService();

      const count = await service.countPending("token", "u1");

      expect(count).toBe(3);
      expect(builders.get("fines")!.eq).toHaveBeenCalledWith("status", "pending");
    });

    it("filtra por vehicle_id quando informado", async () => {
      const { builders } = mockClient({ fines: { count: 1, error: null } });
      const { service } = createService();

      await service.countPending("token", "u1", "veh1");

      expect(builders.get("fines")!.eq).toHaveBeenCalledWith("vehicle_id", "veh1");
    });

    it("lança 404 quando a contagem falha", async () => {
      mockClient({ fines: { count: null, error: { message: "boom" } } });
      const { service } = createService();

      await expect(service.countPending("token", "u1")).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
