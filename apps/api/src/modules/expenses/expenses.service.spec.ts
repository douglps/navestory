import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { AuditService } from "../../shared/audit/audit.service";
import { ExpensesService } from "./expenses.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

/** @spec SPEC-20260814-004 RF-05 — evita depender do binário nativo `sharp` nos testes unitários */
jest.mock("sharp", () => {
  const instance = {
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from("thumbnail-bytes")),
  };
  const factory = jest.fn(() => instance);
  return { __esModule: true, default: factory };
});

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import sharp from "sharp";

describe("ExpensesService", () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `stub-${key}`),
  } as unknown as ConfigService;
  let supabaseAdmin: unknown = {};

  function buildTerminalBuilder(resultOrQueue: unknown) {
    const queue = Array.isArray(resultOrQueue) ? [...resultOrQueue] : undefined;
    const resolveNext = () =>
      queue ? (queue.length > 1 ? queue.shift() : queue[0]) : resultOrQueue;

    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.insert = jest.fn().mockReturnValue(builder);
    builder.update = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.neq = jest.fn().mockReturnValue(builder);
    builder.in = jest.fn().mockReturnValue(builder);
    builder.not = jest.fn().mockReturnValue(builder);
    builder.gte = jest.fn().mockReturnValue(builder);
    builder.lte = jest.fn().mockReturnValue(builder);
    builder.lt = jest.fn().mockReturnValue(builder);
    builder.gt = jest.fn().mockReturnValue(builder);
    builder.is = jest.fn().mockReturnValue(builder);
    builder.order = jest.fn().mockReturnValue(builder);
    builder.limit = jest.fn().mockReturnValue(builder);
    builder.range = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolveNext()));
    builder.single = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolveNext()));
    builder.maybeSingle = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolveNext()));
    // "await builder" support for plain update chains without a terminal method call
    builder.then = ((
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(resolveNext()).then(resolve, reject)) as unknown;
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

  function mockAdminClient(resultsByTable: Record<string, unknown>) {
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
    supabaseAdmin = client;
    return client;
  }

  function createService(auditLog = jest.fn()) {
    const auditService = { log: auditLog } as unknown as AuditService;
    const preferencesService = {
      findOne: jest.fn().mockResolvedValue({ timezone: null }),
    };
    return new ExpensesService(
      supabaseAdmin as never,
      configService,
      auditService,
      preferencesService as never,
    );
  }

  const createDto = {
    vehicle_id: "veh1",
    category: "fuel",
    amount: 150,
    occurred_at: "2026-07-14",
    odometer_km: 50000,
  };

  it("create persiste a despesa quando o veículo pertence ao usuário (RF-01, CA-01)", async () => {
    const { builders } = mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      expenses: [
        { data: { id: "e1", vehicle_id: "veh1" }, error: null },
        { data: null, error: null },
      ],
    });
    const service = createService();

    const expense = await service.create("token", "u1", createDto as never);

    expect(expense).toEqual({ id: "e1", vehicle_id: "veh1" });
    const insertCall = (builders.get("expenses")!.insert as jest.Mock).mock
      .calls[0][0];
    expect(insertCall.is_readonly).toBe(false);
  });

  it("create lança 404 quando vehicle_id não pertence ao usuário (RF-09, CA-12)", async () => {
    mockClient({ vehicles: { data: null, error: null } });
    const service = createService();

    await expect(
      service.create("token", "u1", createDto as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("CT-004b: create com category=fuel e sem odometer_km lança BadRequestException (R4)", async () => {
    mockClient({ vehicles: { data: { id: "veh1" }, error: null } });
    const service = createService();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { odometer_km: _unused, ...dtoSemOdometro } = createDto;

    await expect(
      service.create("token", "u1", dtoSemOdometro as never),
    ).rejects.toBeInstanceOf(BadRequestException);
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
    expect(result.meta).toEqual({
      total: 2,
      page: 1,
      limit: 20,
      has_next: false,
    });
  });

  it("create lança 500 quando o insert falha", async () => {
    mockClient({
      vehicles: { data: { id: "veh1" }, error: null },
      expenses: { data: null, error: { message: "boom" } },
    });
    const service = createService();

    await expect(
      service.create("token", "u1", createDto as never),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it("findAll aplica filtros de vehicle_id, category, date_from e date_to", async () => {
    const { builders } = mockClient({
      expenses: { data: [], error: null, count: 0 },
    });
    const service = createService();

    await service.findAll("token", "u1", {
      page: 1,
      limit: 20,
      vehicle_id: "veh1",
      category: "fuel",
      date_from: "2026-01-01",
      date_to: "2026-01-31",
    } as never);

    expect(builders.get("expenses")!.eq).toHaveBeenCalledWith(
      "vehicle_id",
      "veh1",
    );
    expect(builders.get("expenses")!.eq).toHaveBeenCalledWith(
      "category",
      "fuel",
    );
    expect(builders.get("expenses")!.gte).toHaveBeenCalledWith(
      "occurred_at",
      "2026-01-01",
    );
    expect(builders.get("expenses")!.lt).toHaveBeenCalledWith(
      "occurred_at",
      "2026-02-01T00:00:00.000Z",
    );
  });

  it("findAll lança 500 quando a query falha", async () => {
    mockClient({
      expenses: { data: null, error: { message: "boom" }, count: 0 },
    });
    const service = createService();

    await expect(
      service.findAll("token", "u1", { page: 1, limit: 20 } as never),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it("findOne lança 404 quando a despesa não existe ou não pertence ao usuário (CA-08)", async () => {
    mockClient({ expenses: { data: null, error: null } });
    const service = createService();

    await expect(service.findOne("token", "u1", "e1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("update atualiza apenas os campos enviados (RF-05, CA-13)", async () => {
    const { builders } = mockClient({
      expenses: {
        data: { id: "e1", is_readonly: false, amount: 200 },
        error: null,
      },
    });
    const service = createService();

    await service.update("token", "u1", "e1", { amount: 200 } as never);

    const updateCall = (builders.get("expenses")!.update as jest.Mock).mock
      .calls[0][0];
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

  it("update lança 500 quando o update falha", async () => {
    mockClient({
      expenses: [
        { data: { id: "e1", is_readonly: false, amount: 100 }, error: null },
        { data: null, error: { message: "boom" } },
      ],
    });
    const service = createService();

    await expect(
      service.update("token", "u1", "e1", { amount: 200 } as never),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it("remove lança 403 quando a despesa é readonly (RF-07, CA-10, R-LED-01)", async () => {
    mockClient({
      expenses: { data: { id: "e1", is_readonly: true }, error: null },
    });
    const service = createService();

    await expect(service.remove("token", "u1", "e1")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("remove lança 500 quando o soft-delete falha", async () => {
    mockClient({
      expenses: [
        { data: { id: "e1", is_readonly: false }, error: null },
        { error: { message: "boom" } },
      ],
    });
    const service = createService();

    await expect(service.remove("token", "u1", "e1")).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
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
          {
            data: { id: "e1", vehicle_id: "veh1", odometer_km: 50000 },
            error: null,
          },
          { data: { odometer_km: 80000 }, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create("token", "u1", {
        ...createDto,
        odometer_km: 50000,
      } as never);

      expect(expense).toMatchObject({
        odometer_warning: true,
        odometer_previous_max_km: 80000,
      });
    });

    it("RF-04: create com odometer_km maior ou igual ao máximo não retorna odometer_warning", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: { id: "e1", vehicle_id: "veh1", odometer_km: 90000 },
            error: null,
          },
          { data: { odometer_km: 80000 }, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create("token", "u1", {
        ...createDto,
        odometer_km: 90000,
      } as never);

      expect(expense).not.toHaveProperty("odometer_warning");
    });

    it("EC-01: create sem histórico de odômetro (máximo null) não retorna warning", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: { id: "e1", vehicle_id: "veh1", odometer_km: 50000 },
            error: null,
          },
          { data: null, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create("token", "u1", {
        ...createDto,
        odometer_km: 50000,
      } as never);

      expect(expense).not.toHaveProperty("odometer_warning");
    });

    it("RF-01: create sem odometer_km não consulta o máximo nem retorna warning", async () => {
      const { builders } = mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: { id: "e1", vehicle_id: "veh1", odometer_km: null },
            error: null,
          },
          { data: null, error: null },
        ],
      });
      const service = createService();
      // categoria não-fuel: R4 só exige odometer_km para fuel — mantém o teste focado
      // na lógica de warning, não na validação de obrigatoriedade (coberta por CT-004b)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { odometer_km: _unused, ...dtoSemOdometro } = createDto;

      const expense = await service.create("token", "u1", {
        ...dtoSemOdometro,
        category: "maintenance",
      } as never);

      expect(expense).not.toHaveProperty("odometer_warning");
      expect(
        (builders.get("expenses")!.not as jest.Mock).mock.calls,
      ).toHaveLength(0);
    });

    it("EC-04: odometer_km igual ao máximo não retorna warning", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: { id: "e1", vehicle_id: "veh1", odometer_km: 80000 },
            error: null,
          },
          { data: { odometer_km: 80000 }, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create("token", "u1", {
        ...createDto,
        odometer_km: 80000,
      } as never);

      expect(expense).not.toHaveProperty("odometer_warning");
    });

    it("EC-05: falha na consulta de máximo degrada graciosamente sem warning", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: { id: "e1", vehicle_id: "veh1", odometer_km: 50000 },
            error: null,
          },
          { data: null, error: { message: "timeout" } },
        ],
      });
      const service = createService();

      const expense = await service.create("token", "u1", {
        ...createDto,
        odometer_km: 50000,
      } as never);

      expect(expense).not.toHaveProperty("odometer_warning");
    });

    it("create tolera falha inesperada ao verificar sequência de odômetro", async () => {
      const { builders } = mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: { id: "e1", vehicle_id: "veh1", odometer_km: 50000 },
            error: null,
          },
        ],
      });
      const service = createService();
      (
        builders.get("expenses")!.maybeSingle as jest.Mock
      ).mockImplementationOnce(() => {
        throw new Error("falha inesperada");
      });

      const expense = await service.create("token", "u1", {
        ...createDto,
        odometer_km: 50000,
      } as never);

      expect(expense).not.toHaveProperty("odometer_warning");
    });

    it("RF-05: update exclui o próprio registro da comparação de máximo (excludeExpenseId)", async () => {
      const { builders } = mockClient({
        expenses: [
          {
            data: { id: "e1", is_readonly: false, odometer_km: 80000 },
            error: null,
          },
          {
            data: { id: "e1", is_readonly: false, odometer_km: 79000 },
            error: null,
          },
          { data: null, error: null },
        ],
      });
      const service = createService();

      const expense = await service.update("token", "u1", "e1", {
        odometer_km: 79000,
      } as never);

      expect(expense).not.toHaveProperty("odometer_warning");
      expect(
        (builders.get("expenses")!.neq as jest.Mock).mock.calls[0],
      ).toEqual(["id", "e1"]);
    });

    it("RF-03: update com odometer_km menor que o máximo (excluindo o próprio registro) retorna warning", async () => {
      mockClient({
        expenses: [
          {
            data: { id: "e1", is_readonly: false, odometer_km: 30000 },
            error: null,
          },
          {
            data: { id: "e1", is_readonly: false, odometer_km: 30000 },
            error: null,
          },
          { data: { odometer_km: 80000 }, error: null },
        ],
      });
      const service = createService();

      const expense = await service.update("token", "u1", "e1", {
        odometer_km: 30000,
      } as never);

      expect(expense).toMatchObject({
        odometer_warning: true,
        odometer_previous_max_km: 80000,
      });
    });

    it("RF-01: update sem odometer_km na payload não consulta o máximo", async () => {
      const { builders } = mockClient({
        expenses: {
          data: { id: "e1", is_readonly: false, amount: 200 },
          error: null,
        },
      });
      const service = createService();

      const expense = await service.update("token", "u1", "e1", {
        amount: 200,
      } as never);

      expect(expense).not.toHaveProperty("odometer_warning");
      expect(
        (builders.get("expenses")!.update as jest.Mock).mock.calls,
      ).toHaveLength(1);
    });
  });

  describe("SPEC-20260612-001 RF-04: hard block de odômetro (R-ODO-01, strict)", () => {
    it("create com strict=true rejeita quando odometer_km é menor que o máximo anterior", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: { odometer_km: 500, occurred_at: "2026-07-01" },
            error: null,
          },
        ],
      });
      const service = createService();

      await expect(
        service.create(
          "token",
          "u1",
          { ...createDto, category: "maintenance", odometer_km: 100 } as never,
          true,
        ),
      ).rejects.toMatchObject({
        message: expect.stringContaining(
          "último valor registrado para este veículo foi 500 km em 2026-07-01",
        ),
      });
    });

    it("create com strict=true rejeita quando odometer_km é maior que o mínimo posterior", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          { data: null, error: null },
          {
            data: { odometer_km: 200, occurred_at: "2026-07-20" },
            error: null,
          },
        ],
      });
      const service = createService();

      await expect(
        service.create(
          "token",
          "u1",
          { ...createDto, category: "maintenance", odometer_km: 300 } as never,
          true,
        ),
      ).rejects.toMatchObject({
        message: expect.stringContaining(
          "registro de 200 km em 2026-07-20, posterior a esta despesa",
        ),
      });
    });

    it("create com strict=true persiste e não retorna odometer_warning quando a sequência é válida", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          { data: null, error: null },
          { data: null, error: null },
          {
            data: {
              id: "e1",
              vehicle_id: "veh1",
              category: "maintenance",
              odometer_km: 500,
            },
            error: null,
          },
          { data: null, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create(
        "token",
        "u1",
        { ...createDto, category: "maintenance", odometer_km: 500 } as never,
        true,
      );

      expect(expense).not.toHaveProperty("odometer_warning");
    });

    it("update com strict=true rejeita regressão de odômetro excluindo o próprio registro", async () => {
      mockClient({
        expenses: [
          {
            data: {
              id: "e1",
              is_readonly: false,
              vehicle_id: "veh1",
              date: "2026-07-14",
            },
            error: null,
          },
          { data: { odometer_km: 900, date: "2026-07-01" }, error: null },
        ],
      });
      const service = createService();

      await expect(
        service.update(
          "token",
          "u1",
          "e1",
          { odometer_km: 100 } as never,
          true,
        ),
      ).rejects.toMatchObject({
        message: expect.stringContaining(
          "último valor registrado para este veículo foi 900 km",
        ),
      });
    });

    it("update com strict=false (default) mantém o comportamento soft-warning (R1)", async () => {
      mockClient({
        expenses: [
          {
            data: {
              id: "e1",
              is_readonly: false,
              vehicle_id: "veh1",
              date: "2026-07-14",
            },
            error: null,
          },
          {
            data: { id: "e1", is_readonly: false, odometer_km: 100 },
            error: null,
          },
          { data: { odometer_km: 900, date: "2026-07-01" }, error: null },
        ],
      });
      const service = createService();

      const expense = await service.update("token", "u1", "e1", {
        odometer_km: 100,
      } as never);

      expect(expense).toMatchObject({
        odometer_warning: true,
        odometer_previous_max_km: 900,
      });
    });
  });

  describe("SPEC-20260601-002: detecção de duplicata de despesa", () => {
    it("RF-02, RF-03: create com duplicata ativa existente retorna duplicate_warning e duplicate_id", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: {
              id: "e-novo",
              vehicle_id: "veh1",
              category: "fuel",
              amount: 150,
              occurred_at: "2026-07-14T00:00:00.000Z",
            },
            error: null,
          },
          { data: { id: "e-existente" }, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create("token", "u1", createDto as never);

      expect(expense).toMatchObject({
        duplicate_warning: true,
        duplicate_id: "e-existente",
      });
    });

    it("RF-04: create sem duplicata não retorna duplicate_warning", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: {
              id: "e-novo",
              vehicle_id: "veh1",
              category: "fuel",
              amount: 150,
              occurred_at: "2026-07-14T00:00:00.000Z",
            },
            error: null,
          },
          { data: null, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create("token", "u1", createDto as never);

      expect(expense).not.toHaveProperty("duplicate_warning");
    });

    it("create tolera falha inesperada ao verificar duplicata", async () => {
      const { builders } = mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: {
              id: "e-novo",
              vehicle_id: "veh1",
              category: "toll",
              amount: 150,
              occurred_at: "2026-07-14T00:00:00.000Z",
            },
            error: null,
          },
        ],
      });
      const service = createService();
      (
        builders.get("expenses")!.maybeSingle as jest.Mock
      ).mockImplementationOnce(() => {
        throw new Error("falha inesperada");
      });
      // categoria não-fuel e sem odometer_km: isola a chamada de maybeSingle mockada
      // para a verificação de duplicata, sem interferência de buildOdometerWarning
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { odometer_km: _unused, ...dtoSemOdometro } = createDto;

      const expense = await service.create("token", "u1", {
        ...dtoSemOdometro,
        category: "toll",
      } as never);

      expect(expense).not.toHaveProperty("duplicate_warning");
    });

    it("RF-01, EC-01: busca de duplicata exclui o próprio registro recém-criado da comparação", async () => {
      const { builders } = mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: {
              id: "e-novo",
              vehicle_id: "veh1",
              category: "fuel",
              amount: 150,
              occurred_at: "2026-07-14T00:00:00.000Z",
            },
            error: null,
          },
          { data: null, error: null },
        ],
      });
      const service = createService();

      await service.create("token", "u1", createDto as never);

      expect(
        (builders.get("expenses")!.neq as jest.Mock).mock.calls,
      ).toContainEqual(["id", "e-novo"]);
    });

    it("RF-06: update não invoca verificação de duplicata", async () => {
      const { builders } = mockClient({
        expenses: {
          data: { id: "e1", is_readonly: false, amount: 200 },
          error: null,
        },
      });
      const service = createService();

      const expense = await service.update("token", "u1", "e1", {
        amount: 200,
      } as never);

      expect(expense).not.toHaveProperty("duplicate_warning");
      // findPotentialDuplicate sempre filtra por "category"; update() nunca deveria fazê-lo
      const eqCalls = (builders.get("expenses")!.eq as jest.Mock).mock.calls;
      expect(eqCalls.some(([column]) => column === "category")).toBe(false);
    });

    it("EC-05: falha na consulta de duplicata degrada graciosamente sem warning", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: {
              id: "e-novo",
              vehicle_id: "veh1",
              category: "fuel",
              amount: 150,
              occurred_at: "2026-07-14T00:00:00.000Z",
            },
            error: null,
          },
          { data: null, error: { message: "timeout" } },
        ],
      });
      const service = createService();

      const expense = await service.create("token", "u1", createDto as never);

      expect(expense).not.toHaveProperty("duplicate_warning");
    });
  });

  describe("SPEC-20260606-001: computed.km_per_liter e computed.price_per_liter", () => {
    const fuelDto = {
      vehicle_id: "veh1",
      category: "fuel",
      amount: 261.45,
      occurred_at: "2026-07-14",
      liters: 45,
      full_tank: true,
      odometer_km: 52840,
    };

    it("CA: full_tank=true, liters e histórico presentes calculam km_per_liter e price_per_liter", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: {
              id: "e1",
              vehicle_id: "veh1",
              category: "fuel",
              amount: 261.45,
              liters: 45,
              full_tank: true,
              odometer_km: 52840,
              occurred_at: "2026-07-14T00:00:00.000Z",
            },
            error: null,
          },
          { data: { odometer_km: 52000 }, error: null },
          { data: null, error: null },
          { data: { odometer_km: 52000 }, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create("token", "u1", fuelDto as never);

      expect(expense.computed).toEqual({
        km_per_liter: 18.67,
        price_per_liter: 5.81,
      });
    });

    it("CA: full_tank=false não calcula km_per_liter", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: {
              id: "e1",
              vehicle_id: "veh1",
              category: "fuel",
              amount: 261.45,
              liters: 45,
              full_tank: false,
              odometer_km: 52840,
            },
            error: null,
          },
          { data: null, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create("token", "u1", {
        ...fuelDto,
        full_tank: false,
      } as never);

      expect(expense.computed).toEqual({
        km_per_liter: null,
        price_per_liter: 5.81,
      });
    });

    it("CA: liters ausente zera price_per_liter e km_per_liter", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: {
              id: "e1",
              vehicle_id: "veh1",
              category: "fuel",
              amount: 261.45,
              liters: null,
              full_tank: true,
              odometer_km: 52840,
            },
            error: null,
          },
          { data: null, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create("token", "u1", {
        ...fuelDto,
        liters: null,
      } as never);

      expect(expense.computed).toEqual({
        km_per_liter: null,
        price_per_liter: null,
      });
    });

    it("CA: categoria diferente de fuel não retorna computed", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" }, error: null },
        expenses: [
          {
            data: {
              id: "e1",
              vehicle_id: "veh1",
              category: "maintenance",
              amount: 100,
            },
            error: null,
          },
          { data: null, error: null },
        ],
      });
      const service = createService();

      const expense = await service.create("token", "u1", {
        ...createDto,
        category: "maintenance",
      } as never);

      expect(expense).not.toHaveProperty("computed");
    });
  });

  describe("SPEC-20260814-003: getSupplierSuggestions", () => {
    it("RF-02, RF-06: dedup por forma normalizada, canônico = 1ª ocorrência, ordenado por uso mais recente", async () => {
      mockClient({
        expenses: {
          // ordenação ASC no service: 1ª linha = primeira ocorrência cronológica
          data: [
            { supplier: "Shell Av. Paulista", occurred_at: "2026-07-01" },
            { supplier: "shell av. paulista", occurred_at: "2026-07-14" },
            { supplier: "Ipiranga Centro", occurred_at: "2026-06-20" },
          ],
          error: null,
        },
      });
      const service = createService();

      const suggestions = await service.getSupplierSuggestions("token", "u1");

      expect(suggestions).toEqual([
        { supplier: "Shell Av. Paulista", source: "personal" },
        { supplier: "Ipiranga Centro", source: "personal" },
      ]);
    });

    it("RF-09: sem query, limita a 5 fornecedores pessoais mais recentes", async () => {
      const data = Array.from({ length: 7 }, (_, i) => ({
        supplier: `Posto ${i}`,
        occurred_at: `2026-07-${String(i + 1).padStart(2, "0")}`,
      }));
      mockClient({ expenses: { data, error: null } });
      const service = createService();

      const suggestions = await service.getSupplierSuggestions("token", "u1");

      expect(suggestions).toHaveLength(5);
      expect(suggestions[0]).toEqual({
        supplier: "Posto 6",
        source: "personal",
      });
    });

    it("RF-08: aplica trim + NFC + lowercase na query antes de filtrar", async () => {
      mockClient({
        expenses: {
          data: [{ supplier: "Shell Centro", occurred_at: "2026-07-01" }],
          error: null,
        },
      });
      const service = createService();

      const suggestions = await service.getSupplierSuggestions(
        "token",
        "u1",
        "  SH  ",
      );

      expect(suggestions).toEqual([
        { supplier: "Shell Centro", source: "personal" },
      ]);
    });

    it("lança 500 quando a query pessoal falha", async () => {
      mockClient({ expenses: { data: null, error: { message: "boom" } } });
      const service = createService();

      await expect(
        service.getSupplierSuggestions("token", "u1"),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it("RF-10: histórico de workspace com erro/sem membership não bloqueia sugestões pessoais", async () => {
      mockClient({
        expenses: {
          data: [{ supplier: "Shell Centro", occurred_at: "2026-07-01" }],
          error: null,
        },
        workspace_members: { data: null, error: null }, // maybeSingle -> sem membership
      });
      const service = createService();

      const suggestions = await service.getSupplierSuggestions(
        "token",
        "u1",
        undefined,
        "ws1",
      );

      expect(suggestions).toEqual([
        { supplier: "Shell Centro", source: "personal" },
      ]);
    });

    it("RF-03: combina sugestões de workspace (top 5 por frequência, used_by_count, most_recent_user_name) sem duplicar pessoais", async () => {
      mockClient({
        expenses: {
          data: [{ supplier: "Posto Pessoal", occurred_at: "2026-07-01" }],
          error: null,
        },
        workspace_members: { data: { id: "wm1" }, error: null }, // membership confirmada
      });
      mockAdminClient({
        workspace_members: {
          data: [
            { user_id: "u1", profiles: { name: "Douglas" } },
            { user_id: "u2", profiles: { name: "Ana" } },
          ],
          error: null,
        },
        expenses: {
          // ordenação DESC (mais recente primeiro) — canônico ainda é a 1ª ocorrência
          // cronológica (2026-07-10, "Posto Workspace"), independente da posição no array
          data: [
            {
              user_id: "u2",
              supplier: "POSTO WORKSPACE",
              occurred_at: "2026-08-01",
            },
            {
              user_id: "u1",
              supplier: "posto workspace",
              occurred_at: "2026-07-20",
            },
            {
              user_id: "u2",
              supplier: "Posto Workspace",
              occurred_at: "2026-07-10",
            },
          ],
          error: null,
        },
      });
      const service = createService();

      const suggestions = await service.getSupplierSuggestions(
        "token",
        "u1",
        undefined,
        "ws1",
      );

      expect(suggestions).toEqual([
        { supplier: "Posto Pessoal", source: "personal" },
        {
          supplier: "Posto Workspace",
          source: "workspace",
          used_by_count: 2,
          most_recent_user_name: "Ana",
        },
      ]);
    });
  });

  describe("SPEC-20260814-002 + SPEC-20260807-004: getFuelStats", () => {
    it("RF-04, R-FUEL-11: avg_* nulos quando amostra full_tank < 3, mas last_odometer_km sempre presente", async () => {
      mockClient({
        vehicles: { data: { id: "veh1", favorite_fuel_type: null }, error: null },
        expenses: {
          data: [
            { odometer_km: 1000, liters: 40, amount: 200, full_tank: true },
            { odometer_km: 1400, liters: 40, amount: 220, full_tank: true },
          ],
          error: null,
        },
        // @spec SPEC-20260807-004 RF-01 — maintenances sem registros de odômetro
        maintenances: { data: [], error: null },
      });
      const service = createService();

      const stats = await service.getFuelStats("token", "u1", "veh1");

      expect(stats).toEqual({
        avg_price_per_liter: null,
        avg_km_per_liter: null,
        record_count: 2,
        last_odometer_km: 1400,
        favorite_fuel_type: null,
      });
    });

    it("RF-04: calcula médias de preço/litro e km/L a partir do histórico", async () => {
      mockClient({
        vehicles: { data: { id: "veh1", favorite_fuel_type: "gasoline" }, error: null },
        expenses: {
          data: [
            { odometer_km: 1000, liters: 40, amount: 200, full_tank: true },
            { odometer_km: 1400, liters: 40, amount: 220, full_tank: true },
            { odometer_km: 1800, liters: 40, amount: 240, full_tank: true },
          ],
          error: null,
        },
        maintenances: { data: [], error: null },
      });
      const service = createService();

      const stats = await service.getFuelStats("token", "u1", "veh1");

      // preços: 5.00, 5.50, 6.00 -> média 5.50
      // km/L: (1400-1000)/40=10, (1800-1400)/40=10 -> média 10.0 (1º registro sem odômetro anterior)
      expect(stats).toEqual({
        avg_price_per_liter: 5.5,
        avg_km_per_liter: 10,
        record_count: 3,
        last_odometer_km: 1800,
        favorite_fuel_type: "gasoline",
      });
    });

    it("RF-01 (SPEC-20260807-004): last_odometer_km reflete MAX entre expenses e maintenances", async () => {
      mockClient({
        vehicles: { data: { id: "veh1", favorite_fuel_type: "ethanol" }, error: null },
        expenses: {
          data: [
            { odometer_km: 1000, liters: 40, amount: 200, full_tank: true },
            { odometer_km: 1400, liters: 40, amount: 220, full_tank: true },
          ],
          error: null,
        },
        // manutenção registrada com odômetro maior que o último abastecimento
        maintenances: { data: [{ odometer_km: 1750 }, { odometer_km: 1600 }], error: null },
      });
      const service = createService();

      const stats = await service.getFuelStats("token", "u1", "veh1");

      expect(stats.last_odometer_km).toBe(1750);
      expect(stats.favorite_fuel_type).toBe("ethanol");
    });

    it("RF-05 (SPEC-20260807-004): favorite_fuel_type retorna null quando não definido no veículo", async () => {
      mockClient({
        vehicles: { data: { id: "veh1" /* sem favorite_fuel_type */ }, error: null },
        expenses: { data: [], error: null },
        maintenances: { data: [], error: null },
      });
      const service = createService();

      const stats = await service.getFuelStats("token", "u1", "veh1");

      expect(stats.favorite_fuel_type).toBeNull();
    });

    it("RNF-03: lança 404 quando o veículo não pertence ao usuário", async () => {
      mockClient({ vehicles: { data: null, error: null } });
      const service = createService();

      await expect(
        service.getFuelStats("token", "u1", "veh-outro"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("SPEC-20260608-001: getUpcomingCosts", () => {
    it("RF-01: delega para o RPC get_upcoming_costs", async () => {
      const client = {
        rpc: jest
          .fn()
          .mockResolvedValue({ data: [{ source_type: "fine" }], error: null }),
      };
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      const service = createService();

      const result = await service.getUpcomingCosts("token", {
        horizon_days: 30,
      } as never);

      expect(client.rpc).toHaveBeenCalledWith("get_upcoming_costs", {
        p_vehicle_id: null,
        p_horizon_days: 30,
      });
      expect(result).toEqual([{ source_type: "fine" }]);
    });

    it("RF-01: repassa vehicle_id e horizon_days informados", async () => {
      const client = {
        rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      const service = createService();

      await service.getUpcomingCosts("token", {
        vehicle_id: "veh1",
        horizon_days: 90,
      } as never);

      expect(client.rpc).toHaveBeenCalledWith("get_upcoming_costs", {
        p_vehicle_id: "veh1",
        p_horizon_days: 90,
      });
    });

    it("lança 500 quando o RPC falha", async () => {
      const client = {
        rpc: jest
          .fn()
          .mockResolvedValue({ data: null, error: { message: "boom" } }),
      };
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      const service = createService();

      await expect(
        service.getUpcomingCosts("token", { horizon_days: 30 } as never),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it("SPEC-20260721-002 RF-09, P6: aplica .limit() no builder do RPC quando informado", async () => {
      const limit = jest
        .fn()
        .mockResolvedValue({
          data: [{ source_type: "maintenance" }],
          error: null,
        });
      const client = { rpc: jest.fn().mockReturnValue({ limit }) };
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      const service = createService();

      const result = await service.getUpcomingCosts("token", {
        horizon_days: 7,
        limit: 10,
      } as never);

      expect(client.rpc).toHaveBeenCalledWith("get_upcoming_costs", {
        p_vehicle_id: null,
        p_horizon_days: 7,
      });
      expect(limit).toHaveBeenCalledWith(10);
      expect(result).toEqual([{ source_type: "maintenance" }]);
    });

    it("não chama .limit() quando o parâmetro não é informado", async () => {
      const rpcResult = { data: [], error: null };
      const client = { rpc: jest.fn().mockResolvedValue(rpcResult) };
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      const service = createService();

      await service.getUpcomingCosts("token", { horizon_days: 30 } as never);

      expect(client.rpc).toHaveBeenCalledWith("get_upcoming_costs", {
        p_vehicle_id: null,
        p_horizon_days: 30,
      });
    });
  });

  describe("SPEC-20260608-002: getKpis", () => {
    function mockKpisClient(
      sums: number[],
      upcoming: { data: unknown; error: unknown },
    ) {
      const queue = [...sums];
      const builder: Record<string, unknown> = {};
      builder.select = jest.fn().mockReturnValue(builder);
      builder.eq = jest.fn().mockReturnValue(builder);
      builder.is = jest.fn().mockReturnValue(builder);
      builder.gte = jest.fn().mockReturnValue(builder);
      builder.lt = jest.fn().mockReturnValue(builder);
      builder.then = ((
        resolve: (value: unknown) => unknown,
        reject: (reason: unknown) => unknown,
      ) => {
        const amount = queue.shift() ?? 0;
        return Promise.resolve({ data: [{ amount }], error: null }).then(
          resolve,
          reject,
        );
      }) as unknown;
      const client = {
        from: jest.fn().mockReturnValue(builder),
        rpc: jest.fn().mockResolvedValue(upcoming),
      };
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      return { client, builder };
    }

    it("RF-02: calcula totais do mês, mês anterior, histórico e upcoming", async () => {
      mockKpisClient([100, 50, 500], { data: [{ amount: 30 }], error: null });
      const service = createService();

      const kpis = await service.getKpis("token", "u1", {} as never);

      expect(kpis).toEqual({
        total_this_month: 100,
        total_prev_month: 50,
        delta_percent: 100,
        total_all_time: 500,
        upcoming_30_days_total: 30,
        upcoming_30_days_count: 1,
      });
    });

    it("RF-03, CT-003: delta_percent é null quando total_prev_month = 0", async () => {
      mockKpisClient([50, 0, 50], { data: [], error: null });
      const service = createService();

      const kpis = await service.getKpis("token", "u1", {} as never);

      expect(kpis.delta_percent).toBeNull();
    });

    it("RF-03, CT-004: delta_percent negativo quando gasto cai", async () => {
      mockKpisClient([100, 200, 300], { data: [], error: null });
      const service = createService();

      const kpis = await service.getKpis("token", "u1", {} as never);

      expect(kpis.delta_percent).toBe(-50);
    });

    it("filtra por vehicle_id quando informado", async () => {
      const { builder } = mockKpisClient([100, 50, 500], {
        data: [],
        error: null,
      });
      const service = createService();

      await service.getKpis("token", "u1", { vehicle_id: "veh1" } as never);

      expect(builder.eq).toHaveBeenCalledWith("vehicle_id", "veh1");
    });

    it("lança 500 quando o cálculo de um dos totais falha", async () => {
      const builder: Record<string, unknown> = {};
      builder.select = jest.fn().mockReturnValue(builder);
      builder.eq = jest.fn().mockReturnValue(builder);
      builder.is = jest.fn().mockReturnValue(builder);
      builder.gte = jest.fn().mockReturnValue(builder);
      builder.lt = jest.fn().mockReturnValue(builder);
      builder.then = ((
        resolve: (value: unknown) => unknown,
        reject: (reason: unknown) => unknown,
      ) =>
        Promise.resolve({ data: null, error: { message: "boom" } }).then(
          resolve,
          reject,
        )) as unknown;
      const client = {
        from: jest.fn().mockReturnValue(builder),
        rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      const service = createService();

      await expect(
        service.getKpis("token", "u1", {} as never),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe("EPIC-FIN-001: createFromSource / softDeleteBySource", () => {
    it("R-LED-02, R-LED-05: cria a expense vinculada quando não existe uma ativa para a origem", async () => {
      const { builders } = mockClient({
        expenses: [
          { data: null, error: null },
          {
            data: {
              id: "e1",
              source_type: "recurring_cost",
              source_id: "rc1",
              is_readonly: true,
            },
            error: null,
          },
        ],
      });
      const service = createService();

      const expense = await service.createFromSource("token", "u1", {
        source_type: "recurring_cost",
        source_id: "rc1",
        vehicle_id: "v1",
        category: "tax",
        amount: 1250,
        date: "2026-03-15",
      });

      expect(expense).toEqual({
        id: "e1",
        source_type: "recurring_cost",
        source_id: "rc1",
        is_readonly: true,
      });
      const insertCall = (builders.get("expenses")!.insert as jest.Mock).mock
        .calls[0][0];
      expect(insertCall).toMatchObject({
        is_readonly: true,
        source_type: "recurring_cost",
        source_id: "rc1",
        vehicle_id: "v1",
      });
    });

    it("R-HUB-02: retorna a expense existente sem inserir novamente (idempotência)", async () => {
      const { builders } = mockClient({
        expenses: {
          data: { id: "e1", source_type: "fine", source_id: "f1" },
          error: null,
        },
      });
      const service = createService();

      const expense = await service.createFromSource("token", "u1", {
        source_type: "fine",
        source_id: "f1",
        vehicle_id: "v1",
        category: "fine",
        amount: 195.23,
        date: "2026-07-01",
      });

      expect(expense).toEqual({
        id: "e1",
        source_type: "fine",
        source_id: "f1",
      });
      expect(builders.get("expenses")!.insert).not.toHaveBeenCalled();
    });

    it("lança 500 quando o insert do vínculo com o ledger falha", async () => {
      mockClient({
        expenses: [
          { data: null, error: null },
          { data: null, error: { message: "boom" } },
        ],
      });
      const service = createService();

      await expect(
        service.createFromSource("token", "u1", {
          source_type: "fine",
          source_id: "f1",
          vehicle_id: "v1",
          category: "fine",
          amount: 195.23,
          date: "2026-07-01",
        }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it("softDeleteBySource lança 500 quando o soft-delete falha", async () => {
      mockClient({ expenses: { error: { message: "boom" } } });
      const service = createService();

      await expect(
        service.softDeleteBySource("token", "u1", "recurring_cost", "rc1"),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it("R-HUB-01: softDeleteBySource aplica soft-delete filtrando por source_type/source_id", async () => {
      const { builders } = mockClient({ expenses: { data: {}, error: null } });
      const service = createService();

      await service.softDeleteBySource("token", "u1", "recurring_cost", "rc1");

      const updateCall = (builders.get("expenses")!.update as jest.Mock).mock
        .calls[0][0];
      expect(updateCall.deleted_at).toBeDefined();
      expect(builders.get("expenses")!.eq).toHaveBeenCalledWith(
        "source_type",
        "recurring_cost",
      );
      expect(builders.get("expenses")!.eq).toHaveBeenCalledWith(
        "source_id",
        "rc1",
      );
    });
  });

  describe("SPEC-20260609-003: exportConsolidatedCsv", () => {
    it("RF-01, RF-02: gera CSV com coluna Origem humanizada para cada source_type", async () => {
      mockClient({
        expenses: {
          data: [
            {
              occurred_at: "2026-07-01",
              amount: 150.5,
              category: "fuel",
              description: "Abastecimento",
              source_type: null,
              vehicles: { plate: "ABC1234", make: "Fiat", model: "Uno" },
            },
            {
              occurred_at: "2026-06-15",
              amount: 950,
              category: "maintenance",
              description: null,
              source_type: "maintenance",
              vehicles: { plate: "ABC1234", make: "Fiat", model: "Uno" },
            },
            {
              occurred_at: "2026-06-01",
              amount: 195.23,
              category: "fine",
              description: null,
              source_type: "fine",
              vehicles: { plate: "ABC1234", make: "Fiat", model: "Uno" },
            },
            {
              occurred_at: "2026-03-31",
              amount: 1250,
              category: "tax",
              description: null,
              source_type: "recurring_cost",
              vehicles: { plate: "ABC1234", make: "Fiat", model: "Uno" },
            },
          ],
          error: null,
        },
      });
      const service = createService();

      const csv = await service.exportConsolidatedCsv(
        "token",
        "u1",
        {} as never,
      );

      expect(csv).toContain(
        "Data,Veiculo,Placa,Categoria,Valor,Origem,Descricao",
      );
      expect(csv).toContain("Despesa Manual");
      expect(csv).toContain("Manutenção");
      expect(csv).toContain("Multa");
      expect(csv).toContain("Documento");
    });

    it("aplica from/to informados na query em vez do default de 12 meses", async () => {
      const { builders } = mockClient({ expenses: { data: [], error: null } });
      const service = createService();

      await service.exportConsolidatedCsv("token", "u1", {
        from: "2026-01-01",
        to: "2026-01-31",
      } as never);

      expect(builders.get("expenses")!.gte).toHaveBeenCalledWith(
        "occurred_at",
        "2026-01-01",
      );
      expect(builders.get("expenses")!.lt).toHaveBeenCalledWith(
        "occurred_at",
        "2026-02-01T00:00:00.000Z",
      );
    });

    it("retorna apenas o header quando a query falha", async () => {
      mockClient({ expenses: { data: null, error: { message: "boom" } } });
      const service = createService();

      const csv = await service.exportConsolidatedCsv(
        "token",
        "u1",
        {} as never,
      );

      expect(csv).toBe("Data,Veiculo,Placa,Categoria,Valor,Origem,Descricao\n");
    });

    it("filtra por vehicle_id quando informado", async () => {
      const { builders } = mockClient({ expenses: { data: [], error: null } });
      const service = createService();

      await service.exportConsolidatedCsv("token", "u1", {
        vehicle_id: "veh1",
      } as never);

      expect(builders.get("expenses")!.eq).toHaveBeenCalledWith(
        "vehicle_id",
        "veh1",
      );
    });
  });

  describe("SPEC-20260814-004: uploadReceipt", () => {
    const existingExpense = {
      id: "e1",
      user_id: "u1",
      vehicle_id: "veh1",
      deleted_at: null,
    };

    it("R-SAN-05: rejeita MIME não suportado mesmo contornando o interceptor do controller", async () => {
      mockClient({ expenses: { data: existingExpense, error: null } });
      const service = createService();

      await expect(
        service.uploadReceipt("token", "u1", "e1", {
          buffer: Buffer.from("x"),
          mimetype: "application/msword",
          size: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("RF-04, R-RCP-01: rejeita arquivo acima de 10MB mesmo contornando o interceptor", async () => {
      mockClient({ expenses: { data: existingExpense, error: null } });
      const service = createService();

      await expect(
        service.uploadReceipt("token", "u1", "e1", {
          buffer: Buffer.alloc(1),
          mimetype: "image/jpeg",
          size: 11 * 1024 * 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("RF-04: 404 quando a despesa não existe ou não pertence ao usuário", async () => {
      mockClient({ expenses: { data: null, error: null } });
      const service = createService();

      await expect(
        service.uploadReceipt("token", "u1", "e404", {
          buffer: Buffer.from("x"),
          mimetype: "image/jpeg",
          size: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("RF-03, RF-05, RF-07, R-RCP-02, R-RCP-03: gera path {user_id}/{uuid}.ext, marca thumbnail pending para imagem e audita sem storage_key completo", async () => {
      const auditLog = jest.fn();
      const { client, builders } = mockClient({
        expenses: [
          { data: existingExpense, error: null }, // findOne
          {
            data: { ...existingExpense, receipt_storage_key: "u1/x.jpg" },
            error: null,
          }, // update
        ],
      });
      const uploadMock = jest.fn().mockResolvedValue({ data: {}, error: null });
      (client as { storage?: unknown }).storage = {
        from: jest.fn(() => ({ upload: uploadMock, createSignedUrl: jest.fn() })),
      };
      const service = createService(auditLog);

      await service.uploadReceipt("token", "u1", "e1", {
        buffer: Buffer.from("fake-jpeg-bytes"),
        mimetype: "image/jpeg",
        size: 2048,
      });

      expect(
        (client as unknown as { storage: { from: jest.Mock } }).storage.from,
      ).toHaveBeenCalledWith("receipts");
      expect(uploadMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /^u1\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/,
        ),
        expect.any(Buffer),
        { contentType: "image/jpeg", upsert: false },
      );
      expect(builders.get("expenses")!.update).toHaveBeenCalledWith(
        expect.objectContaining({ receipt_thumbnail_status: "pending" }),
      );

      const uploadedAudit = auditLog.mock.calls
        .map((call) => call[0] as Record<string, unknown>)
        .find((entry) => entry.action === "RECEIPT_UPLOADED");
      expect(uploadedAudit).toEqual(
        expect.objectContaining({ action: "RECEIPT_UPLOADED", recordId: "e1" }),
      );
      expect(JSON.stringify(uploadedAudit?.changes)).not.toContain("u1/");
    });

    it("RF-05, RF-09: PDF marca thumbnail_status not_applicable e nunca dispara geração de thumbnail", async () => {
      const { client } = mockClient({
        expenses: [
          { data: existingExpense, error: null },
          {
            data: { ...existingExpense, receipt_storage_key: "u1/x.pdf" },
            error: null,
          },
        ],
      });
      const uploadMock = jest.fn().mockResolvedValue({ data: {}, error: null });
      (client as { storage?: unknown }).storage = {
        from: jest.fn(() => ({ upload: uploadMock, createSignedUrl: jest.fn() })),
      };
      const service = createService();
      const thumbnailSpy = jest
        .spyOn(
          service as unknown as {
            generateReceiptThumbnail: (...args: unknown[]) => Promise<void>;
          },
          "generateReceiptThumbnail",
        )
        .mockResolvedValue(undefined);

      await service.uploadReceipt("token", "u1", "e1", {
        buffer: Buffer.from("%PDF-1.4"),
        mimetype: "application/pdf",
        size: 512,
      });

      expect(uploadMock).toHaveBeenCalledWith(
        expect.stringMatching(/\.pdf$/),
        expect.any(Buffer),
        { contentType: "application/pdf", upsert: false },
      );
      expect(thumbnailSpy).not.toHaveBeenCalled();
    });

    it("upload no storage falhando lança InternalServerErrorException", async () => {
      const { client } = mockClient({
        expenses: { data: existingExpense, error: null },
      });
      (client as { storage?: unknown }).storage = {
        from: jest.fn(() => ({
          upload: jest
            .fn()
            .mockResolvedValue({ data: null, error: { message: "boom" } }),
          createSignedUrl: jest.fn(),
        })),
      };
      const service = createService();

      await expect(
        service.uploadReceipt("token", "u1", "e1", {
          buffer: Buffer.from("x"),
          mimetype: "image/jpeg",
          size: 10,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe("SPEC-20260814-004: generateReceiptThumbnail (privado)", () => {
    function callThumbnail(
      service: ExpensesService,
      args: {
        storageKey?: string;
        buffer?: Buffer;
      } = {},
    ) {
      return (
        service as unknown as {
          generateReceiptThumbnail: (
            accessToken: string,
            userId: string,
            expenseId: string,
            storageKey: string,
            buffer: Buffer,
          ) => Promise<void>;
        }
      ).generateReceiptThumbnail(
        "token",
        "u1",
        "e1",
        args.storageKey ?? "u1/abc123.jpg",
        args.buffer ?? Buffer.from("original-bytes"),
      );
    }

    it("RF-05, RF-06, R-RCP-05: redimensiona 400px/JPEG 80%, salva thumb_{uuid}.jpg e marca completed", async () => {
      const { client, builders } = mockClient({ expenses: { data: {}, error: null } });
      const uploadMock = jest.fn().mockResolvedValue({ data: {}, error: null });
      (client as { storage?: unknown }).storage = {
        from: jest.fn(() => ({ upload: uploadMock, createSignedUrl: jest.fn() })),
      };
      const service = createService();

      await callThumbnail(service, { storageKey: "u1/abc123.jpg" });

      expect(sharp).toHaveBeenCalled();
      const sharpResult = (sharp as unknown as jest.Mock).mock.results[0];
      const sharpInstance = sharpResult?.value as {
        resize: jest.Mock;
        jpeg: jest.Mock;
      };
      expect(sharpInstance.resize).toHaveBeenCalledWith(400, 400, {
        fit: "inside",
        withoutEnlargement: true,
      });
      expect(sharpInstance.jpeg).toHaveBeenCalledWith({ quality: 80 });
      expect(uploadMock).toHaveBeenCalledWith(
        "u1/thumb_abc123.jpg",
        expect.any(Buffer),
        { contentType: "image/jpeg", upsert: false },
      );
      expect(builders.get("expenses")!.update).toHaveBeenCalledWith({
        receipt_thumbnail_key: "u1/thumb_abc123.jpg",
        receipt_thumbnail_status: "completed",
      });
    });

    it("falha na geração marca receipt_thumbnail_status=failed e não propaga exceção", async () => {
      const { client, builders } = mockClient({ expenses: { data: {}, error: null } });
      (client as { storage?: unknown }).storage = {
        from: jest.fn(() => ({
          upload: jest
            .fn()
            .mockResolvedValue({ data: null, error: { message: "boom" } }),
          createSignedUrl: jest.fn(),
        })),
      };
      const service = createService();

      await expect(callThumbnail(service)).resolves.toBeUndefined();

      expect(builders.get("expenses")!.update).toHaveBeenCalledWith({
        receipt_thumbnail_status: "failed",
      });
    });
  });

  describe("SPEC-20260814-004: getReceiptUrls", () => {
    it("RF-04: 404 quando a despesa não tem comprovante", async () => {
      mockClient({
        expenses: {
          data: { id: "e1", user_id: "u1", receipt_storage_key: null },
          error: null,
        },
      });
      const service = createService();

      await expect(
        service.getReceiptUrls("token", "u1", "e1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("RF-07, RNF-03, R-RCP-03: retorna signed URLs (60min) e audita RECEIPT_ACCESSED", async () => {
      const auditLog = jest.fn();
      const { client } = mockClient({
        expenses: {
          data: {
            id: "e1",
            user_id: "u1",
            receipt_storage_key: "u1/abc.jpg",
            receipt_thumbnail_key: "u1/thumb_abc.jpg",
            receipt_thumbnail_status: "completed",
          },
          error: null,
        },
      });
      const createSignedUrl = jest
        .fn()
        .mockResolvedValueOnce({
          data: { signedUrl: "https://signed/original" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { signedUrl: "https://signed/thumb" },
          error: null,
        });
      (client as { storage?: unknown }).storage = {
        from: jest.fn(() => ({ upload: jest.fn(), createSignedUrl })),
      };
      const service = createService(auditLog);

      const urls = await service.getReceiptUrls("token", "u1", "e1");

      expect(createSignedUrl).toHaveBeenNthCalledWith(1, "u1/abc.jpg", 3600);
      expect(createSignedUrl).toHaveBeenNthCalledWith(
        2,
        "u1/thumb_abc.jpg",
        3600,
      );
      expect(urls).toEqual({
        original_url: "https://signed/original",
        thumbnail_url: "https://signed/thumb",
        thumbnail_status: "completed",
        is_pdf: false,
      });
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "RECEIPT_ACCESSED",
          recordId: "e1",
        }),
      );
    });

    it("is_pdf=true quando receipt_storage_key termina em .pdf; thumbnail_url null sem thumbnail_key", async () => {
      const { client } = mockClient({
        expenses: {
          data: {
            id: "e1",
            user_id: "u1",
            receipt_storage_key: "u1/abc.pdf",
            receipt_thumbnail_key: null,
            receipt_thumbnail_status: "not_applicable",
          },
          error: null,
        },
      });
      (client as { storage?: unknown }).storage = {
        from: jest.fn(() => ({
          upload: jest.fn(),
          createSignedUrl: jest
            .fn()
            .mockResolvedValue({
              data: { signedUrl: "https://signed/original" },
              error: null,
            }),
        })),
      };
      const service = createService();

      const urls = await service.getReceiptUrls("token", "u1", "e1");

      expect(urls.is_pdf).toBe(true);
      expect(urls.thumbnail_url).toBeNull();
    });
  });
});
