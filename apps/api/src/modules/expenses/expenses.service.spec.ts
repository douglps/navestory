import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { AuditService } from "../../shared/audit/audit.service";
import { ExpensesService } from "./expenses.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("ExpensesService", () => {
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
    builder.gte = jest.fn().mockReturnValue(builder);
    builder.lte = jest.fn().mockReturnValue(builder);
    builder.is = jest.fn().mockReturnValue(builder);
    builder.order = jest.fn().mockReturnValue(builder);
    builder.limit = jest.fn().mockReturnValue(builder);
    builder.range = jest.fn().mockImplementation(() => Promise.resolve(resolveNext()));
    builder.single = jest.fn().mockImplementation(() => Promise.resolve(resolveNext()));
    builder.maybeSingle = jest.fn().mockImplementation(() => Promise.resolve(resolveNext()));
    // "await builder" support for plain update chains without a terminal method call
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

  function createService(auditLog = jest.fn()) {
    const auditService = { log: auditLog } as unknown as AuditService;
    return new ExpensesService(supabaseAdmin, configService, auditService);
  }

  const createDto = { vehicle_id: "veh1", category: "fuel", amount: 150, date: "2026-07-14" };

  it("create persiste a despesa quando o veículo pertence ao usuário (RF-01, CA-01)", async () => {
    const { builders } = mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      expenses: { data: { id: "e1", vehicle_id: "veh1" }, error: null },
    });
    const service = createService();

    const expense = await service.create("token", "u1", createDto as never);

    expect(expense).toEqual({ id: "e1", vehicle_id: "veh1" });
    const insertCall = (builders.get("expenses")!.insert as jest.Mock).mock.calls[0][0];
    expect(insertCall.is_readonly).toBe(false);
  });

  it("create lança 404 quando vehicle_id não pertence ao usuário (RF-09, CA-12)", async () => {
    mockClient({ vehicles: { data: null, error: null } });
    const service = createService();

    await expect(service.create("token", "u1", createDto as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("findAll retorna envelope paginado com meta (RF-03, P1)", async () => {
    mockClient({
      expenses: { data: [{ id: "e1" }, { id: "e2" }], error: null, count: 2 },
    });
    const service = createService();

    const result = await service.findAll("token", "u1", {
      page: 1,
      limit: 20,
    } as never);

    expect(result.data).toHaveLength(2);
    expect(result.meta).toEqual({ total: 2, page: 1, limit: 20, has_next: false });
  });

  it("findOne lança 404 quando a despesa não existe ou não pertence ao usuário (CA-08)", async () => {
    mockClient({ expenses: { data: null, error: null } });
    const service = createService();

    await expect(service.findOne("token", "u1", "e1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("update atualiza apenas os campos enviados (RF-05, CA-13)", async () => {
    const { builders } = mockClient({
      expenses: { data: { id: "e1", is_readonly: false, amount: 200 }, error: null },
    });
    const service = createService();

    await service.update("token", "u1", "e1", { amount: 200 } as never);

    const updateCall = (builders.get("expenses")!.update as jest.Mock).mock.calls[0][0];
    expect(updateCall).toEqual({ amount: 200 });
  });

  it("update lança 403 quando a despesa é readonly (RF-07, CA-09, R-LED-01)", async () => {
    mockClient({
      expenses: { data: { id: "e1", is_readonly: true }, error: null },
    });
    const service = createService();

    await expect(
      service.update("token", "u1", "e1", { amount: 200 } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("remove lança 403 quando a despesa é readonly (RF-07, CA-10, R-LED-01)", async () => {
    mockClient({
      expenses: { data: { id: "e1", is_readonly: true }, error: null },
    });
    const service = createService();

    await expect(service.remove("token", "u1", "e1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("remove aplica soft-delete quando a despesa é editável (RF-06, CA-11)", async () => {
    mockClient({
      expenses: { data: { id: "e1", is_readonly: false }, error: null },
    });
    const auditLog = jest.fn();
    const service = createService(auditLog);

    await service.remove("token", "u1", "e1");

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "EXPENSE_DELETED", recordId: "e1" }),
    );
  });

  describe("SPEC-20260601-001: validação de sequência de odômetro", () => {
    it("RF-01, RF-03: create com odometer_km menor que o máximo retorna odometer_warning", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          { data: { id: "e1", vehicle_id: "veh1", odometer_km: 50000 }, error: null },
          { data: { odometer_km: 80000 }, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create(
        "token",
        "u1",
        { ...createDto, odometer_km: 50000 } as never,
      );

      expect(expense).toMatchObject({ odometer_warning: true, odometer_previous_max_km: 80000 });
    });

    it("RF-04: create com odometer_km maior ou igual ao máximo não retorna odometer_warning", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          { data: { id: "e1", vehicle_id: "veh1", odometer_km: 90000 }, error: null },
          { data: { odometer_km: 80000 }, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create(
        "token",
        "u1",
        { ...createDto, odometer_km: 90000 } as never,
      );

      expect(expense).not.toHaveProperty("odometer_warning");
    });

    it("EC-01: create sem histórico de odômetro (máximo null) não retorna warning", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          { data: { id: "e1", vehicle_id: "veh1", odometer_km: 50000 }, error: null },
          { data: null, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create(
        "token",
        "u1",
        { ...createDto, odometer_km: 50000 } as never,
      );

      expect(expense).not.toHaveProperty("odometer_warning");
    });

    it("RF-01: create sem odometer_km não consulta o máximo nem retorna warning", async () => {
      const { builders } = mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: { data: { id: "e1", vehicle_id: "veh1", odometer_km: null }, error: null },
      });
      const service = createService();

      const expense = await service.create("token", "u1", createDto as never);

      expect(expense).not.toHaveProperty("odometer_warning");
      expect((builders.get("expenses")!.select as jest.Mock).mock.calls).toHaveLength(1);
    });

    it("EC-04: odometer_km igual ao máximo não retorna warning", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          { data: { id: "e1", vehicle_id: "veh1", odometer_km: 80000 }, error: null },
          { data: { odometer_km: 80000 }, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create(
        "token",
        "u1",
        { ...createDto, odometer_km: 80000 } as never,
      );

      expect(expense).not.toHaveProperty("odometer_warning");
    });

    it("EC-05: falha na consulta de máximo degrada graciosamente sem warning", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          { data: { id: "e1", vehicle_id: "veh1", odometer_km: 50000 }, error: null },
          { data: null, error: { message: "timeout" } },
        ],
      });
      const service = createService();

      const expense = await service.create(
        "token",
        "u1",
        { ...createDto, odometer_km: 50000 } as never,
      );

      expect(expense).not.toHaveProperty("odometer_warning");
    });

    it("RF-05: update exclui o próprio registro da comparação de máximo (excludeExpenseId)", async () => {
      const { builders } = mockClient({
        expenses: [
          { data: { id: "e1", is_readonly: false, odometer_km: 80000 }, error: null },
          { data: { id: "e1", is_readonly: false, odometer_km: 79000 }, error: null },
          { data: null, error: null },
        ],
      });
      const service = createService();

      const expense = await service.update("token", "u1", "e1", { odometer_km: 79000 } as never);

      expect(expense).not.toHaveProperty("odometer_warning");
      expect((builders.get("expenses")!.neq as jest.Mock).mock.calls[0]).toEqual(["id", "e1"]);
    });

    it("RF-03: update com odometer_km menor que o máximo (excluindo o próprio registro) retorna warning", async () => {
      mockClient({
        expenses: [
          { data: { id: "e1", is_readonly: false, odometer_km: 30000 }, error: null },
          { data: { id: "e1", is_readonly: false, odometer_km: 30000 }, error: null },
          { data: { odometer_km: 80000 }, error: null },
        ],
      });
      const service = createService();

      const expense = await service.update("token", "u1", "e1", { odometer_km: 30000 } as never);

      expect(expense).toMatchObject({ odometer_warning: true, odometer_previous_max_km: 80000 });
    });

    it("RF-01: update sem odometer_km na payload não consulta o máximo", async () => {
      const { builders } = mockClient({
        expenses: { data: { id: "e1", is_readonly: false, amount: 200 }, error: null },
      });
      const service = createService();

      const expense = await service.update("token", "u1", "e1", { amount: 200 } as never);

      expect(expense).not.toHaveProperty("odometer_warning");
      expect((builders.get("expenses")!.update as jest.Mock).mock.calls).toHaveLength(1);
    });
  });
});
