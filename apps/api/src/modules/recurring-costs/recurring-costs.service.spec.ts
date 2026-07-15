import { ConflictException, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { AuditService } from "../../shared/audit/audit.service";
import type { ExpensesService } from "../expenses/expenses.service";
import { RecurringCostsService } from "./recurring-costs.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("RecurringCostsService", () => {
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
    builder.not = jest.fn().mockReturnValue(builder);
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
      service: new RecurringCostsService(supabaseAdmin, configService, auditService, expensesService),
      expensesService,
    };
  }

  const createDto = {
    vehicle_id: "veh1",
    cost_type: "ipva" as const,
    year: 2026,
    amount: 1250.0,
    due_date: "2026-03-31",
  };

  it("CT-REC-01: create persiste o custo recorrente quando o veículo pertence ao usuário", async () => {
    const { builders } = mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      vehicle_recurring_costs: [
        { data: null, error: null },
        { data: { id: "rc1", vehicle_id: "veh1", cost_type: "ipva", year: 2026, paid_at: null }, error: null },
      ],
    });
    const { service } = createService();

    const recurringCost = await service.create("token", "u1", createDto as never);

    expect(recurringCost).toMatchObject({ id: "rc1" });
    const insertCall = (builders.get("vehicle_recurring_costs")!.insert as jest.Mock).mock.calls[0][0];
    expect(insertCall.user_id).toBe("u1");
  });

  it("CT-REC-02: create lança 404 quando o veículo não pertence ao usuário", async () => {
    mockClient({ vehicles: { data: null, error: null } });
    const { service } = createService();

    await expect(service.create("token", "u1", createDto as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("CT-REC-03: create com paid_at chama createFromSource (R-LED-05)", async () => {
    mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      vehicle_recurring_costs: [
        { data: null, error: null },
        {
          data: {
            id: "rc1",
            vehicle_id: "veh1",
            cost_type: "ipva",
            year: 2026,
            amount: 1250.0,
            paid_at: "2026-03-15",
          },
          error: null,
        },
        { data: { id: "rc1", expense_id: "e1" }, error: null },
      ],
    });
    const { service, expensesService } = createService();

    await service.create("token", "u1", { ...createDto, paid_at: "2026-03-15" } as never);

    expect(expensesService.createFromSource).toHaveBeenCalledWith("token", "u1", {
      source_type: "recurring_cost",
      source_id: "rc1",
      vehicle_id: "veh1",
      category: "tax",
      amount: 1250.0,
      date: "2026-03-15",
      description: "IPVA 2026",
    });
  });

  it("CT-REC-04: create lança 409 quando já existe registro para vehicle_id+cost_type+year (R-REC-01)", async () => {
    mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      vehicle_recurring_costs: { data: { id: "rc-existing" }, error: null },
    });
    const { service } = createService();

    await expect(service.create("token", "u1", createDto as never)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("CT-REC-05: update com paid_at null → data chama createFromSource", async () => {
    mockClient({
      vehicle_recurring_costs: [
        { data: { id: "rc1", vehicle_id: "veh1", cost_type: "ipva", year: 2026, amount: 1250, paid_at: null }, error: null },
        {
          data: {
            id: "rc1",
            vehicle_id: "veh1",
            cost_type: "ipva",
            year: 2026,
            amount: 1250,
            paid_at: "2026-03-15",
          },
          error: null,
        },
        { data: { id: "rc1", expense_id: "e1" }, error: null },
      ],
    });
    const { service, expensesService } = createService();

    await service.update("token", "u1", "rc1", { paid_at: "2026-03-15" } as never);

    expect(expensesService.createFromSource).toHaveBeenCalled();
  });

  it("CT-REC-06: update com paid_at já definido não chama createFromSource novamente", async () => {
    mockClient({
      vehicle_recurring_costs: [
        {
          data: { id: "rc1", vehicle_id: "veh1", cost_type: "ipva", year: 2026, amount: 1250, paid_at: "2026-03-15" },
          error: null,
        },
        {
          data: { id: "rc1", vehicle_id: "veh1", cost_type: "ipva", year: 2026, amount: 1250, notes: "atualizado", paid_at: "2026-03-15" },
          error: null,
        },
      ],
    });
    const { service, expensesService } = createService();

    await service.update("token", "u1", "rc1", { notes: "atualizado" } as never);

    expect(expensesService.createFromSource).not.toHaveBeenCalled();
  });

  it("CT-REC-07: remove chama softDeleteBySource", async () => {
    mockClient({
      vehicle_recurring_costs: { data: { id: "rc1", paid_at: null }, error: null },
    });
    const { service, expensesService } = createService();

    await service.remove("token", "u1", "rc1");

    expect(expensesService.softDeleteBySource).toHaveBeenCalledWith(
      "token",
      "u1",
      "recurring_cost",
      "rc1",
    );
  });

  it("CT-REC-08: findAll filtra por user_id e exclui deleted_at IS NOT NULL", async () => {
    const { builders } = mockClient({
      vehicle_recurring_costs: { data: [{ id: "rc1" }], error: null },
    });
    const { service } = createService();

    const result = await service.findAll("token", "u1", {} as never);

    expect(builders.get("vehicle_recurring_costs")!.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(builders.get("vehicle_recurring_costs")!.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result).toHaveLength(1);
  });

  it("findAll aplica filtro paid=true (não pago vs pago)", async () => {
    const { builders } = mockClient({
      vehicle_recurring_costs: { data: [], error: null },
    });
    const { service } = createService();

    await service.findAll("token", "u1", { paid: true } as never);

    expect(builders.get("vehicle_recurring_costs")!.not).toHaveBeenCalledWith("paid_at", "is", null);
  });

  it("findOne lança 404 quando não encontrado", async () => {
    mockClient({ vehicle_recurring_costs: { data: null, error: null } });
    const { service } = createService();

    await expect(service.findOne("token", "u1", "rc1")).rejects.toBeInstanceOf(NotFoundException);
  });
});
