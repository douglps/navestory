import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { AuditService } from "../../shared/audit/audit.service";
import type { VehiclesService } from "../vehicles/vehicles.service";
import { OdometerCyclesService } from "./odometer-cycles.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("OdometerCyclesService", () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `stub-${key}`),
  } as unknown as ConfigService;

  function createService(
    vehiclesOverrides?: Partial<VehiclesService>,
    auditLog = jest.fn(),
  ) {
    const vehiclesService = {
      findOne: jest.fn().mockResolvedValue({ id: "v1" }),
      ...vehiclesOverrides,
    } as unknown as VehiclesService;
    const auditService = { log: auditLog } as unknown as AuditService;
    return new OdometerCyclesService(configService, auditService, vehiclesService);
  }

  function mockClient(from: Record<string, unknown>, rpc?: jest.Mock) {
    const tables = new Map(Object.entries(from));
    const client = {
      from: jest.fn().mockImplementation((table: string) => tables.get(table)),
      rpc: rpc ?? jest.fn(),
    };
    (createUserScopedClient as jest.Mock).mockReturnValue(client);
    return client;
  }

  it("create lança 404 quando o veículo não pertence ao usuário (EC-10)", async () => {
    const vehiclesService = {
      findOne: jest.fn().mockRejectedValue(new NotFoundException("Veículo não encontrado")),
    } as unknown as VehiclesService;
    const service = new OdometerCyclesService(
      configService,
      { log: jest.fn() } as unknown as AuditService,
      vehiclesService,
    );

    await expect(
      service.create("token", "other-user", "v1", { starting_value: 0, reason: "Troca" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("create calcula cycle_number = 2 no primeiro reset e persiste previous_cycle_max (RF-08)", async () => {
    const expensesBuilder: Record<string, unknown> = {};
    expensesBuilder.select = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.eq = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.is = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.not = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.order = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.limit = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.maybeSingle = jest.fn().mockResolvedValue({
      data: { odometer_km: 87000 },
      error: null,
    });

    const cyclesBuilder: Record<string, unknown> = {};
    cyclesBuilder.select = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.eq = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.order = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.limit = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    cyclesBuilder.insert = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.single = jest.fn().mockResolvedValue({
      data: {
        id: "cy1",
        vehicle_id: "v1",
        cycle_number: 2,
        started_at: "2026-07-13T00:00:00Z",
        starting_value: 0,
        previous_cycle_max: 87000,
        reason: "Troca de painel",
        created_by: "u1",
        created_at: "2026-07-13T00:00:00Z",
      },
      error: null,
    });

    mockClient({ expenses: expensesBuilder, vehicle_odometer_cycles: cyclesBuilder });
    const auditLog = jest.fn();
    const service = createService(undefined, auditLog);

    const cycle = await service.create("token", "u1", "v1", {
      starting_value: 0,
      reason: "Troca de painel",
    });

    expect(cycle.cycle_number).toBe(2);
    expect(cycle.previous_cycle_max).toBe(87000);
    expect(cyclesBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ cycle_number: 2, previous_cycle_max: 87000 }),
    );
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ODOMETER_CYCLE_CREATED", recordId: "cy1" }),
    );
    expect(auditLog.mock.calls[0][0]).not.toHaveProperty("changes");
  });

  it("create incrementa cycle_number a partir do último ciclo existente (D3)", async () => {
    const expensesBuilder: Record<string, unknown> = {};
    expensesBuilder.select = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.eq = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.is = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.not = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.order = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.limit = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

    const cyclesBuilder: Record<string, unknown> = {};
    cyclesBuilder.select = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.eq = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.order = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.limit = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.maybeSingle = jest.fn().mockResolvedValue({
      data: { cycle_number: 2 },
      error: null,
    });
    cyclesBuilder.insert = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.single = jest.fn().mockResolvedValue({
      data: { id: "cy2", cycle_number: 3 },
      error: null,
    });

    mockClient({ expenses: expensesBuilder, vehicle_odometer_cycles: cyclesBuilder });
    const service = createService();

    const cycle = await service.create("token", "u1", "v1", {
      starting_value: 0,
      reason: "Segundo reset",
    });

    expect(cycle.cycle_number).toBe(3);
  });

  it("create lança BadRequestException quando o insert falha", async () => {
    const expensesBuilder: Record<string, unknown> = {};
    expensesBuilder.select = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.eq = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.is = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.not = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.order = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.limit = jest.fn().mockReturnValue(expensesBuilder);
    expensesBuilder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

    const cyclesBuilder: Record<string, unknown> = {};
    cyclesBuilder.select = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.eq = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.order = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.limit = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    cyclesBuilder.insert = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.single = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });

    mockClient({ expenses: expensesBuilder, vehicle_odometer_cycles: cyclesBuilder });
    const service = createService();

    await expect(
      service.create("token", "u1", "v1", { starting_value: 0, reason: "Troca" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("findAll retorna ciclos ordenados por cycle_number ascendente (RF-09)", async () => {
    const cyclesBuilder: Record<string, unknown> = {};
    cyclesBuilder.select = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.eq = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.order = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.range = jest.fn().mockResolvedValue({
      data: [{ cycle_number: 2 }, { cycle_number: 3 }],
      error: null,
    });

    mockClient({ vehicle_odometer_cycles: cyclesBuilder });
    const service = createService();

    const cycles = await service.findAll("token", "u1", "v1");

    expect(cycles).toHaveLength(2);
    expect(cyclesBuilder.order).toHaveBeenCalledWith("cycle_number", { ascending: true });
  });

  it("findAll aplica clamp de limit entre 1 e 100 (P1)", async () => {
    const cyclesBuilder: Record<string, unknown> = {};
    cyclesBuilder.select = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.eq = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.order = jest.fn().mockReturnValue(cyclesBuilder);
    cyclesBuilder.range = jest.fn().mockResolvedValue({ data: [], error: null });

    mockClient({ vehicle_odometer_cycles: cyclesBuilder });
    const service = createService();

    await service.findAll("token", "u1", "v1", 500, 0);

    expect(cyclesBuilder.range).toHaveBeenCalledWith(0, 99);
  });

  it("getActiveCycleStart retorna null quando não há ciclos (EC-01)", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    mockClient({}, rpc);
    const service = createService();

    const result = await service.getActiveCycleStart("token", "u1", "v1");

    expect(result).toBeNull();
    expect(rpc).toHaveBeenCalledWith("get_active_cycle_start", { p_vehicle_id: "v1" });
  });

  it("getActiveCycleStart degrada graciosamente em caso de falha (EC-06, D6)", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    mockClient({}, rpc);
    const service = createService();

    const result = await service.getActiveCycleStart("token", "u1", "v1");

    expect(result).toBeNull();
  });
});
