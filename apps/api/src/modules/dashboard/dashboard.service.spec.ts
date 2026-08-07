import type { ConfigService } from "@nestjs/config";
import { DashboardService } from "./dashboard.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("DashboardService", () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `stub-${key}`),
  } as unknown as ConfigService;
  const supabaseAdmin = {} as never;

  function buildTerminalBuilder(result: unknown) {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.is = jest.fn().mockReturnValue(builder);
    builder.gte = jest.fn().mockReturnValue(builder);
    builder.lte = jest.fn().mockReturnValue(builder);
    builder.lt = jest.fn().mockReturnValue(builder);
    builder.order = jest.fn().mockReturnValue(builder);
    builder.limit = jest.fn().mockResolvedValue(result);
    return builder;
  }

  function mockClient(result: unknown) {
    const builder = buildTerminalBuilder(result);
    const client = { from: jest.fn().mockReturnValue(builder) };
    (createUserScopedClient as jest.Mock).mockReturnValue(client);
    return { client, builder };
  }

  const expensesService = {
    getKpis: jest.fn(),
    findAll: jest.fn(),
    getUpcomingCosts: jest.fn(),
  };
  const maintenancesService = {
    findAll: jest.fn(),
  };
  const preferencesService = {
    // @spec SPEC-20260804-001 RF-01 — default seguro (R-PREF-01)
    findOne: jest.fn().mockResolvedValue({ timezone: null, spending_window_days: 7 }),
  };

  function createService() {
    return new DashboardService(
      supabaseAdmin,
      configService,
      expensesService as never,
      maintenancesService as never,
      preferencesService as never,
    );
  }

  function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function toDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  it("gera CSV com cabeçalho e linhas formatadas (RF-04, CA-02, CA-03)", async () => {
    mockClient({
      data: [
        {
          occurred_at: "2026-05-10",
          amount: 150.5,
          category: "fuel",
          description: "Abastecimento",
          vehicles: { plate: "ABC1234", model: "Onix" },
        },
      ],
      error: null,
    });
    const service = createService();

    const csv = await service.exportExpensesCsv("token", "u1", "2026-05", undefined);

    expect(csv).toBe(
      "Data,Placa,Modelo,Categoria,Descricao,Valor\n2026-05-10,ABC1234,Onix,fuel,Abastecimento,150.50\n",
    );
  });

  it("retorna apenas cabeçalho quando não há despesas no período (CA-07)", async () => {
    mockClient({ data: [], error: null });
    const service = createService();

    const csv = await service.exportExpensesCsv("token", "u1", "2026-05", undefined);

    expect(csv).toBe("Data,Placa,Modelo,Categoria,Descricao,Valor\n");
  });

  it("filtra por vehicle_id quando informado (RF-03, CA-06)", async () => {
    const { builder } = mockClient({ data: [], error: null });
    const service = createService();

    await service.exportExpensesCsv("token", "u1", "2026-05", "veh1");

    expect(builder.eq).toHaveBeenCalledWith("vehicle_id", "veh1");
  });

  it("retorna apenas cabeçalho quando a query falha", async () => {
    mockClient({ data: null, error: { message: "boom" } });
    const service = createService();

    const csv = await service.exportExpensesCsv("token", "u1", "2026-05", undefined);

    expect(csv).toBe("Data,Placa,Modelo,Categoria,Descricao,Valor\n");
  });

  it("usa fallback vazio quando data vem undefined da query (sem erro)", async () => {
    mockClient({ data: undefined, error: null });
    const service = createService();

    const csv = await service.exportExpensesCsv("token", "u1", "2026-05", undefined);

    expect(csv).toBe("Data,Placa,Modelo,Categoria,Descricao,Valor\n");
  });

  it("resolve vehicles quando vem como array e aplica fallback quando ausente (RF-04)", async () => {
    mockClient({
      data: [
        {
          occurred_at: "2026-05-10",
          amount: 100,
          category: "fuel",
          description: null,
          vehicles: [{ plate: "ABC1234", model: null }],
        },
        {
          occurred_at: "2026-05-11",
          amount: 50,
          category: "fuel",
          description: null,
          vehicles: null,
        },
      ],
      error: null,
    });
    const service = createService();

    const csv = await service.exportExpensesCsv("token", "u1", "2026-05", undefined);

    expect(csv).toContain("2026-05-10,ABC1234,,fuel,,100.00");
    expect(csv).toContain("2026-05-11,,,fuel,,50.00");
  });

  it("escapa campos com vírgula ou aspas (CA-04)", async () => {
    mockClient({
      data: [
        {
          occurred_at: "2026-05-10",
          amount: 10,
          category: "other",
          description: 'Pedágio, "praça 5"',
          vehicles: { plate: "ABC1234", model: "Onix" },
        },
      ],
      error: null,
    });
    const service = createService();

    const csv = await service.exportExpensesCsv("token", "u1", "2026-05", undefined);

    expect(csv).toContain('"Pedágio, ""praça 5"""');
  });

  function createQueryBuilder(result: { data?: unknown; error?: unknown; count?: number }) {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "in", "gte", "lte", "lt", "order", "limit", "not"]) {
      // eslint-disable-next-line security/detect-object-injection -- method vem de lista fixa acima, não de input externo
      builder[method] = jest.fn().mockReturnValue(builder);
    }
    builder.then = (resolve: (value: typeof result) => unknown) => resolve(result);
    return builder as unknown as PromiseLike<typeof result> & Record<string, jest.Mock>;
  }

  function mockFrom(byTable: Record<string, { data?: unknown; error?: unknown; count?: number }>) {
    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    for (const [table, result] of Object.entries(byTable)) {
      // eslint-disable-next-line security/detect-object-injection -- table vem das chaves do próprio objeto de fixture do teste
      builders[table] = createQueryBuilder(result);
    }
    // eslint-disable-next-line security/detect-object-injection -- table vem das chaves do próprio objeto de fixture do teste
    return jest.fn((table: string) => builders[table]);
  }

  describe("getFleetHealth (RF-SH-01, RF-SH-02)", () => {
    it("retorna score e flags de cada veículo da RPC", async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: [{ vehicle_id: "v1", score: 80, flags: [] }],
        error: null,
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getFleetHealth("token", "u1");

      expect(rpc).toHaveBeenCalledWith("calculate_fleet_health", { p_user_id: "u1" });
      expect(result).toEqual([{ vehicle_id: "v1", score: 80, flags: [] }]);
    });

    it("retorna array vazio quando a RPC não retorna data", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: undefined, error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getFleetHealth("token", "u1");

      expect(result).toEqual([]);
    });

    it("lança 500 quando a RPC falha", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      await expect(service.getFleetHealth("token", "u1")).rejects.toThrow(
        "Não foi possível calcular a saúde da frota",
      );
    });
  });

  describe("getAlerts (RF-DA-01, RF-DA-02)", () => {
    it("classifica manutenções vencidas e futuras e mapeia a placa", async () => {
      const today = new Date();
      const overdue = toDateString(addDays(today, -3));
      const upcoming = toDateString(addDays(today, 2));
      const from = mockFrom({
        maintenances: {
          data: [
            {
              id: "m1",
              vehicle_id: "v1",
              description: "Troca de óleo",
              scheduled_date: overdue,
              vehicles: { plate: "ABC1234" },
            },
            {
              id: "m2",
              vehicle_id: "v2",
              description: "Revisão",
              scheduled_date: upcoming,
              vehicles: { plate: "DEF5678" },
            },
          ],
          error: null,
        },
        vehicles: { data: [], error: null },
        vehicle_recurring_costs: { data: [], error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      const alerts = await service.getAlerts("token", "u1");

      expect(alerts).toHaveLength(2);
      expect(alerts[0]).toMatchObject({ type: "maintenance_overdue", vehicle_plate: "ABC1234" });
      expect(alerts[1]).toMatchObject({ type: "maintenance_upcoming", vehicle_plate: "DEF5678" });
    });

    it("lança 500 quando a query falha", async () => {
      const from = mockFrom({
        maintenances: { data: null, error: { message: "boom" } },
        vehicles: { data: [], error: null },
        vehicle_recurring_costs: { data: [], error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      await expect(service.getAlerts("token", "u1")).rejects.toThrow(
        "Não foi possível carregar os alertas da frota",
      );
    });

    it("gera alerta de documento vencido não reconciliado e omite o pago (CA-S3-02, RF-DB-06)", async () => {
      const today = new Date();
      const overdueIpva = toDateString(addDays(today, -3));
      const overdueInsurance = toDateString(addDays(today, -5));

      const from = mockFrom({
        maintenances: { data: [], error: null },
        vehicles: {
          data: [
            {
              id: "v1",
              plate: "GHI9012",
              ipva_due_date: overdueIpva,
              insurance_expires_at: overdueInsurance,
              crlv_expires_at: null,
            },
          ],
          error: null,
        },
        vehicle_recurring_costs: {
          data: [{ vehicle_id: "v1", cost_type: "insurance" }],
          error: null,
        },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      const alerts = await service.getAlerts("token", "u1");

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: "document_overdue",
        vehicle_plate: "GHI9012",
        description: "IPVA vencido",
      });
    });

    it("ignora documento ainda não vencido (dentro do prazo)", async () => {
      const today = new Date();
      const futureIpva = toDateString(addDays(today, 10));

      const from = mockFrom({
        maintenances: { data: [], error: null },
        vehicles: {
          data: [
            {
              id: "v1",
              plate: "GHI9012",
              ipva_due_date: futureIpva,
              insurance_expires_at: null,
              crlv_expires_at: null,
            },
          ],
          error: null,
        },
        vehicle_recurring_costs: { data: [], error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      const alerts = await service.getAlerts("token", "u1");

      expect(alerts).toHaveLength(0);
    });

    it("com includeUpcomingDocuments: true, inclui documento a vencer dentro de 30 dias como document_upcoming", async () => {
      const today = new Date();
      const futureIpva = toDateString(addDays(today, 10));

      const from = mockFrom({
        maintenances: { data: [], error: null },
        vehicles: {
          data: [
            {
              id: "v1",
              plate: "GHI9012",
              ipva_due_date: futureIpva,
              insurance_expires_at: null,
              crlv_expires_at: null,
            },
          ],
          error: null,
        },
        vehicle_recurring_costs: { data: [], error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      const alerts = await service.getAlerts("token", "u1", { includeUpcomingDocuments: true });

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: "document_upcoming",
        vehicle_plate: "GHI9012",
        description: "IPVA vence em breve",
      });
    });

    it("mesmo com includeUpcomingDocuments: true, ignora documento fora do horizonte de 30 dias", async () => {
      const today = new Date();
      const farFuture = toDateString(addDays(today, 45));

      const from = mockFrom({
        maintenances: { data: [], error: null },
        vehicles: {
          data: [
            {
              id: "v1",
              plate: "GHI9012",
              ipva_due_date: farFuture,
              insurance_expires_at: null,
              crlv_expires_at: null,
            },
          ],
          error: null,
        },
        vehicle_recurring_costs: { data: [], error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      const alerts = await service.getAlerts("token", "u1", { includeUpcomingDocuments: true });

      expect(alerts).toHaveLength(0);
    });

    it("usa fallback vazio quando as queries retornam data undefined (sem erro)", async () => {
      const from = mockFrom({
        maintenances: { data: undefined, error: null },
        vehicles: { data: undefined, error: null },
        vehicle_recurring_costs: { data: undefined, error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      const alerts = await service.getAlerts("token", "u1");

      expect(alerts).toEqual([]);
    });

    it("resolve a placa da manutenção quando vehicles vem como array", async () => {
      const today = new Date();
      const overdue = toDateString(addDays(today, -3));
      const from = mockFrom({
        maintenances: {
          data: [
            {
              id: "m1",
              vehicle_id: "v1",
              description: "Troca de óleo",
              scheduled_date: overdue,
              vehicles: [{ plate: "ABC1234" }],
            },
          ],
          error: null,
        },
        vehicles: { data: [], error: null },
        vehicle_recurring_costs: { data: [], error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      const alerts = await service.getAlerts("token", "u1");

      expect(alerts[0]).toMatchObject({ vehicle_plate: "ABC1234" });
    });
  });

  describe("getFleetKpis (RF-DA-03, CA-S1-05.1)", () => {
    it("agrega os 4 KPIs com sucesso", async () => {
      (expensesService.getKpis as jest.Mock).mockResolvedValue({ total_this_month: 1234.5 });
      const from = mockFrom({
        maintenances: { count: 2, error: null, data: [{ scheduled_date: "2026-08-01", vehicles: { plate: "ABC1234" } }] },
        vehicles: { data: [{ id: "v1" }, { id: "v2" }], error: null },
      });
      const rpc = jest.fn().mockResolvedValue({
        data: [{ total_spent: 100, total_km: 200 }],
        error: null,
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpis("token", "u1", undefined);

      expect(kpis.total_this_month).toEqual({ ok: true, value: 1234.5 });
      expect(kpis.urgent_maintenance_count).toEqual({ ok: true, value: 2 });
      expect(kpis.cost_per_km).toEqual({ ok: true, value: 0.5 });
      expect(kpis.next_maintenance).toEqual({
        ok: true,
        value: { date: "2026-08-01", vehicle_plate: "ABC1234" },
      });
    });

    it("SPEC-20260804-006 RF-04: converte scheduled_date (timestamptz) para calendário YYYY-MM-DD, nunca o timestamp bruto", async () => {
      (expensesService.getKpis as jest.Mock).mockResolvedValue({ total_this_month: 0 });
      const from = mockFrom({
        maintenances: {
          count: 1,
          error: null,
          data: [
            {
              scheduled_date: "2026-08-10T00:00:00+00:00",
              vehicles: { plate: "ABC1234" },
            },
          ],
        },
        vehicles: { data: [], error: null },
      });
      const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpis("token", "u1", undefined);

      expect(kpis.next_maintenance).toEqual({
        ok: true,
        value: { date: "2026-08-10", vehicle_plate: "ABC1234" },
      });
    });

    it("isola a falha de um KPI sem derrubar os demais (CA-S1-05.1)", async () => {
      (expensesService.getKpis as jest.Mock).mockRejectedValue(new Error("falhou"));
      const from = mockFrom({
        maintenances: { count: 0, error: null, data: [] },
        vehicles: { data: [], error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc: jest.fn() });
      const service = createService();

      const kpis = await service.getFleetKpis("token", "u1", undefined);

      expect(kpis.total_this_month).toEqual({ ok: false });
      expect(kpis.urgent_maintenance_count).toEqual({ ok: true, value: 0 });
      expect(kpis.cost_per_km).toEqual({ ok: true, value: null });
      expect(kpis.next_maintenance).toEqual({ ok: true, value: null });
    });
  });

  describe("getVehicleCards (RF-DA-04)", () => {
    it("classifica documentos vencido/atenção/ok/desconhecido e traz o último abastecimento", async () => {
      const today = new Date();
      const overdueDate = toDateString(addDays(today, -1));
      const attentionDate = toDateString(addDays(today, 10));
      const okDate = toDateString(addDays(today, 90));

      const from = jest.fn((table: string) => {
        if (table === "vehicles") {
          return createQueryBuilder({
            data: [
              {
                id: "v1",
                plate: "ABC1234",
                make: "Honda",
                model: "Civic",
                nickname: null,
                odometer: 50_000,
                ipva_due_date: overdueDate,
                insurance_expires_at: attentionDate,
                crlv_expires_at: okDate,
              },
              {
                id: "v2",
                plate: "DEF5678",
                make: "Fiat",
                model: "Uno",
                nickname: null,
                odometer: 30_000,
                ipva_due_date: null,
                insurance_expires_at: null,
                crlv_expires_at: null,
              },
            ],
            error: null,
          });
        }
        return createQueryBuilder({ data: [{ occurred_at: "2026-07-01", amount: 200 }], error: null });
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      const cards = await service.getVehicleCards("token", "u1");

      expect(cards).toHaveLength(2);
      expect(cards[0]?.documents).toEqual({ ipva: "overdue", insurance: "attention", crlv: "ok" });
      expect(cards[0]?.last_fuel_date).toBe("2026-07-01");
      expect(cards[1]?.documents).toEqual({ ipva: "unknown", insurance: "unknown", crlv: "unknown" });
    });

    it("SPEC-20260804-006 RF-04: converte occurred_at (timestamptz) para calendário YYYY-MM-DD, nunca o timestamp bruto", async () => {
      const from = jest.fn((table: string) => {
        if (table === "vehicles") {
          return createQueryBuilder({
            data: [
              {
                id: "v1",
                plate: "ABC1234",
                make: "Honda",
                model: "Civic",
                nickname: null,
                odometer: 50_000,
                ipva_due_date: null,
                insurance_expires_at: null,
                crlv_expires_at: null,
              },
            ],
            error: null,
          });
        }
        return createQueryBuilder({
          data: [{ occurred_at: "2026-07-01T23:45:00+00:00", amount: 200, odometer_km: 49_500 }],
          error: null,
        });
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      const cards = await service.getVehicleCards("token", "u1");

      expect(cards[0]?.last_fuel_date).toBe("2026-07-01");
    });

    it("lança 500 quando a query de veículos falha", async () => {
      const from = mockFrom({ vehicles: { data: null, error: { message: "boom" } } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      await expect(service.getVehicleCards("token", "u1")).rejects.toThrow(
        "Não foi possível carregar os veículos da frota",
      );
    });

    it("retorna array vazio quando data de veículos vem undefined sem erro", async () => {
      const from = mockFrom({ vehicles: { data: undefined, error: null } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      const cards = await service.getVehicleCards("token", "u1");

      expect(cards).toEqual([]);
    });

    it("last_fuel_date/amount ficam null quando não há abastecimento registrado", async () => {
      const from = jest.fn((table: string) => {
        if (table === "vehicles") {
          return createQueryBuilder({
            data: [
              {
                id: "v1",
                plate: "ABC1234",
                make: "Honda",
                model: "Civic",
                nickname: null,
                odometer: 50_000,
                ipva_due_date: null,
                insurance_expires_at: null,
                crlv_expires_at: null,
              },
            ],
            error: null,
          });
        }
        return createQueryBuilder({ data: [], error: null });
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      const cards = await service.getVehicleCards("token", "u1");

      expect(cards[0]).toMatchObject({
        last_fuel_date: null,
        last_fuel_amount: null,
        last_fuel_odometer_missing: false,
      });
    });

    it("last_fuel_odometer_missing é true quando o abastecimento não tem odometer_km", async () => {
      const from = jest.fn((table: string) => {
        if (table === "vehicles") {
          return createQueryBuilder({
            data: [
              {
                id: "v1",
                plate: "ABC1234",
                make: "Honda",
                model: "Civic",
                nickname: null,
                odometer: 50_000,
                ipva_due_date: null,
                insurance_expires_at: null,
                crlv_expires_at: null,
              },
            ],
            error: null,
          });
        }
        return createQueryBuilder({
          data: [{ occurred_at: "2026-07-01", amount: 200, odometer_km: null }],
          error: null,
        });
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      const cards = await service.getVehicleCards("token", "u1");

      expect(cards[0]?.last_fuel_odometer_missing).toBe(true);
    });

    it("propaga erro ao buscar o último abastecimento do veículo", async () => {
      const from = jest.fn((table: string) => {
        if (table === "vehicles") {
          return createQueryBuilder({
            data: [
              {
                id: "v1",
                plate: "ABC1234",
                make: "Honda",
                model: "Civic",
                nickname: null,
                odometer: 50_000,
                ipva_due_date: null,
                insurance_expires_at: null,
                crlv_expires_at: null,
              },
            ],
            error: null,
          });
        }
        return createQueryBuilder({ data: null, error: { message: "boom" } });
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      await expect(service.getVehicleCards("token", "u1")).rejects.toThrow("boom");
    });
  });

  describe("getAlerts — falhas de alertas de documento", () => {
    it("lança 500 quando a query de veículos (documentos) falha", async () => {
      const from = mockFrom({
        maintenances: { data: [], error: null },
        vehicles: { data: null, error: { message: "boom" } },
        vehicle_recurring_costs: { data: [], error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      await expect(service.getAlerts("token", "u1")).rejects.toThrow(
        "Não foi possível carregar os alertas da frota",
      );
    });

    it("lança 500 quando a query de custos recorrentes pagos falha", async () => {
      const from = mockFrom({
        maintenances: { data: [], error: null },
        vehicles: { data: [], error: null },
        vehicle_recurring_costs: { data: null, error: { message: "boom" } },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      await expect(service.getAlerts("token", "u1")).rejects.toThrow(
        "Não foi possível carregar os alertas da frota",
      );
    });
  });

  describe("getFleetKpis — falhas isoladas por KPI", () => {
    it("isola falha de urgent_maintenance_count sem afetar os demais", async () => {
      (expensesService.getKpis as jest.Mock).mockResolvedValue({ total_this_month: 100 });
      const from = mockFrom({
        maintenances: { count: undefined, error: { message: "boom" }, data: [] },
        vehicles: { data: [], error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc: jest.fn() });
      const service = createService();

      const kpis = await service.getFleetKpis("token", "u1", undefined);

      expect(kpis.urgent_maintenance_count).toEqual({ ok: false });
      expect(kpis.total_this_month).toEqual({ ok: true, value: 100 });
    });

    it("isola falha de cost_per_km quando a query de veículos falha", async () => {
      (expensesService.getKpis as jest.Mock).mockResolvedValue({ total_this_month: 100 });
      const from = mockFrom({
        maintenances: { count: 0, error: null, data: [] },
        vehicles: { data: null, error: { message: "boom" } },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc: jest.fn() });
      const service = createService();

      const kpis = await service.getFleetKpis("token", "u1", undefined);

      expect(kpis.cost_per_km).toEqual({ ok: false });
    });

    it("isola falha de cost_per_km quando a RPC de custo por km falha", async () => {
      (expensesService.getKpis as jest.Mock).mockResolvedValue({ total_this_month: 100 });
      const from = mockFrom({
        maintenances: { count: 0, error: null, data: [] },
        vehicles: { data: [{ id: "v1" }], error: null },
      });
      const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpis("token", "u1", undefined);

      expect(kpis.cost_per_km).toEqual({ ok: false });
    });

    it("filtra a próxima manutenção pelo veículo ativo quando informado", async () => {
      (expensesService.getKpis as jest.Mock).mockResolvedValue({ total_this_month: 100 });
      const from = mockFrom({
        maintenances: { count: 0, error: null, data: [] },
        vehicles: { data: [], error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc: jest.fn() });
      const service = createService();

      await service.getFleetKpis("token", "u1", "v1");

      const maintenancesBuilder = from("maintenances") as unknown as Record<string, jest.Mock>;
      expect(maintenancesBuilder.eq).toHaveBeenCalledWith("vehicle_id", "v1");
    });

    it("usa fallback 0 quando count vem undefined sem erro (urgent_maintenance_count)", async () => {
      (expensesService.getKpis as jest.Mock).mockResolvedValue({ total_this_month: 100 });
      const from = mockFrom({
        maintenances: { count: undefined, error: null, data: [] },
        vehicles: { data: [], error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc: jest.fn() });
      const service = createService();

      const kpis = await service.getFleetKpis("token", "u1", undefined);

      expect(kpis.urgent_maintenance_count).toEqual({ ok: true, value: 0 });
    });

    it("cost_per_km ignora resultado de RPC sem linha (continue) e aplica fallback nos totais", async () => {
      (expensesService.getKpis as jest.Mock).mockResolvedValue({ total_this_month: 100 });
      const from = mockFrom({
        maintenances: { count: 0, error: null, data: [] },
        vehicles: { data: [{ id: "v1" }, { id: "v2" }], error: null },
      });
      let rpcCalls = 0;
      const rpc = jest.fn().mockImplementation(() => {
        rpcCalls += 1;
        // v1: sem linha (continue) — v2: linha com total_spent/total_km ausentes (fallback 0)
        return Promise.resolve(
          rpcCalls === 1 ? { data: [], error: null } : { data: [{}], error: null },
        );
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpis("token", "u1", undefined);

      expect(kpis.cost_per_km).toEqual({ ok: true, value: null });
    });

    it("cost_per_km usa fallback vazio quando vehicles vem undefined sem erro", async () => {
      (expensesService.getKpis as jest.Mock).mockResolvedValue({ total_this_month: 100 });
      const from = mockFrom({
        maintenances: { count: 0, error: null, data: [] },
        vehicles: { data: undefined, error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc: jest.fn() });
      const service = createService();

      const kpis = await service.getFleetKpis("token", "u1", undefined);

      expect(kpis.cost_per_km).toEqual({ ok: true, value: null });
    });

    it("next_maintenance usa fallback vazio quando data vem undefined sem erro", async () => {
      (expensesService.getKpis as jest.Mock).mockResolvedValue({ total_this_month: 100 });
      const from = mockFrom({
        maintenances: { count: 0, error: null, data: undefined },
        vehicles: { data: [], error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc: jest.fn() });
      const service = createService();

      const kpis = await service.getFleetKpis("token", "u1", undefined);

      expect(kpis.next_maintenance).toEqual({ ok: true, value: null });
    });

    it("isola falha de next_maintenance quando a query de manutenções falha", async () => {
      (expensesService.getKpis as jest.Mock).mockResolvedValue({ total_this_month: 100 });
      let maintenancesCalls = 0;
      const from = jest.fn((table: string) => {
        if (table === "maintenances") {
          maintenancesCalls += 1;
          // 1ª chamada = countUrgentMaintenances (sucesso), 2ª = getNextMaintenance (falha)
          return maintenancesCalls === 1
            ? createQueryBuilder({ count: 0, error: null })
            : createQueryBuilder({ data: null, error: { message: "boom" } });
        }
        return createQueryBuilder({ data: [], error: null });
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc: jest.fn() });
      const service = createService();

      const kpis = await service.getFleetKpis("token", "u1", undefined);

      expect(kpis.next_maintenance).toEqual({ ok: false });
      expect(kpis.urgent_maintenance_count).toEqual({ ok: true, value: 0 });
    });
  });

  describe("getFleetKpiCatalog (RF-01, R-KPI-02)", () => {
    function buildRpcMock(overrides: Partial<Record<string, { data: unknown; error: unknown }>> = {}) {
      return jest.fn((fn: string) => {
        if (fn === "get_vehicle_cost_per_km") {
          return Promise.resolve(
            overrides.get_vehicle_cost_per_km ?? { data: [{ total_spent: 0, total_km: 0 }], error: null },
          );
        }
        if (fn === "calculate_fleet_health") {
          return Promise.resolve(overrides.calculate_fleet_health ?? { data: [], error: null });
        }
        if (fn === "detect_expense_anomalies") {
          return Promise.resolve(overrides.detect_expense_anomalies ?? { data: [], error: null });
        }
        return Promise.resolve({ data: null, error: { message: `rpc desconhecida: ${fn}` } });
      });
    }

    it("agrega os 8 KPIs do catálogo com sucesso", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([{ amount: 50 }, { amount: 30 }]);
      const from = mockFrom({
        expenses: {
          data: [{ occurred_at: toDateString(new Date()), amount: 100 }],
          count: 5,
          error: null,
        },
        vehicles: { data: [{ id: "v1" }], count: 1, error: null },
        maintenances: { count: 2, error: null, data: [] },
      });
      const rpc = buildRpcMock({
        get_vehicle_cost_per_km: { data: [{ total_spent: 100, total_km: 200 }], error: null },
        calculate_fleet_health: { data: [{ vehicle_id: "v1", score: 80 }], error: null },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.expenses_month).toEqual({
        ok: true,
        value: { value: 100, delta_pct: null, history_6mo: [0, 0, 0, 0, 0, 100] },
      });
      expect(kpis.cost_per_km).toEqual({
        ok: true,
        value: { value: 0.5, delta_pct: null, history_6mo: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5] },
      });
      expect(kpis.fleet_health).toEqual({ ok: true, value: 80 });
      expect(kpis.urgent_maintenance).toEqual({ ok: true, value: 2 });
      expect(kpis.total_vehicles).toEqual({ ok: true, value: 1 });
      expect(kpis.next_maintenance).toEqual({ ok: true, value: null });
      expect(kpis.upcoming_costs_7d).toEqual({ ok: true, value: { total: 80, count: 2 } });
      expect(kpis.expense_anomalies).toEqual({
        ok: true,
        value: { count: 0, insufficient_sample: false },
      });
      expect(expensesService.getUpcomingCosts).toHaveBeenCalledWith("token", {
        vehicle_id: undefined,
        horizon_days: 7,
      });
    });

    it("suprime delta_pct quando a amostra do mês anterior tem menos de 3 registros (R-KPI-02)", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const today = new Date();
      const prevMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 10));
      const from = mockFrom({
        expenses: {
          data: [
            { occurred_at: toDateString(prevMonth), amount: 100 },
            { occurred_at: toDateString(prevMonth), amount: 100 },
            { occurred_at: toDateString(today), amount: 400 },
          ],
          error: null,
        },
        vehicles: { data: [], count: 0, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock();
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.expenses_month).toEqual({
        ok: true,
        value: { value: 400, delta_pct: null, history_6mo: [0, 0, 0, 0, 200, 400] },
      });
    });

    it("calcula delta_pct quando a amostra do mês anterior tem 3+ registros", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const today = new Date();
      const prevMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 10));
      const from = mockFrom({
        expenses: {
          data: [
            { occurred_at: toDateString(prevMonth), amount: 100 },
            { occurred_at: toDateString(prevMonth), amount: 100 },
            { occurred_at: toDateString(prevMonth), amount: 100 },
            { occurred_at: toDateString(today), amount: 600 },
          ],
          error: null,
        },
        vehicles: { data: [], count: 0, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock();
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.expenses_month).toEqual({
        ok: true,
        value: { value: 600, delta_pct: 100, history_6mo: [0, 0, 0, 0, 300, 600] },
      });
    });

    it("fleet_health retorna null quando a frota não tem veículos", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const from = mockFrom({
        expenses: { data: [], error: null },
        vehicles: { data: [], count: 0, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock({ calculate_fleet_health: { data: [], error: null } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.fleet_health).toEqual({ ok: true, value: null });
    });

    it("isola falha de cost_per_km sem afetar os demais KPIs do catálogo", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const from = mockFrom({
        expenses: { data: [], error: null },
        vehicles: { data: [{ id: "v1" }], count: 1, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock({
        get_vehicle_cost_per_km: { data: null, error: { message: "boom" } },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.cost_per_km).toEqual({ ok: false });
      expect(kpis.expenses_month.ok).toBe(true);
      expect(kpis.total_vehicles).toEqual({ ok: true, value: 1 });
    });

    it("isola falha de upcoming_costs_7d quando a RPC de próximos compromissos falha", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockRejectedValue(new Error("boom"));
      const from = mockFrom({
        expenses: { data: [], error: null },
        vehicles: { data: [], count: 0, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock();
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.upcoming_costs_7d).toEqual({ ok: false });
    });

    it("expenses_month: ignora linha com mês fora da janela de 6 meses (bucket ausente)", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const from = mockFrom({
        expenses: { data: [{ occurred_at: "2000-01-15", amount: 999 }], error: null },
        vehicles: { data: [], count: 0, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock();
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.expenses_month).toEqual({
        ok: true,
        value: { value: 0, delta_pct: null, history_6mo: [0, 0, 0, 0, 0, 0] },
      });
    });

    it("expenses_month: usa fallback vazio quando data vem undefined sem erro", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const from = mockFrom({
        expenses: { data: undefined, error: null },
        vehicles: { data: [], count: 0, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock();
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.expenses_month).toEqual({
        ok: true,
        value: { value: 0, delta_pct: null, history_6mo: [0, 0, 0, 0, 0, 0] },
      });
    });

    it("isola falha de expenses_month quando a query de despesas falha", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const from = mockFrom({
        expenses: { data: null, error: { message: "boom" } },
        vehicles: { data: [], count: 0, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock();
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.expenses_month).toEqual({ ok: false });
    });

    it("isola falha de cost_per_km quando a query de veículos falha", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const from = mockFrom({
        expenses: { data: [], error: null },
        vehicles: { data: null, count: undefined, error: { message: "boom" } },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock();
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.cost_per_km).toEqual({ ok: false });
    });

    it("cost_per_km: usa fallback vazio quando vehicles.data vem undefined sem erro", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const from = mockFrom({
        expenses: { data: [], error: null },
        vehicles: { data: undefined, count: undefined, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock();
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.cost_per_km).toEqual({
        ok: true,
        value: { value: 0, delta_pct: null, history_6mo: [0, 0, 0, 0, 0, 0] },
      });
      expect(kpis.total_vehicles).toEqual({ ok: true, value: 0 });
    });

    it("cost_per_km: ignora resultado de RPC sem linha e aplica fallback quando total_spent/total_km vêm null", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const from = mockFrom({
        expenses: { data: [], error: null },
        vehicles: { data: [{ id: "v1" }, { id: "v2" }], count: 2, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      let calls = 0;
      const rpc = jest.fn((fn: string) => {
        if (fn !== "get_vehicle_cost_per_km") return buildRpcMock()(fn);
        calls += 1;
        // v1: sem linha (continue) — v2: linha com total_spent/total_km nulos (fallback 0)
        return Promise.resolve(
          calls % 2 === 1 ? { data: [], error: null } : { data: [{ total_spent: null, total_km: null }], error: null },
        );
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.cost_per_km).toEqual({
        ok: true,
        value: { value: 0, delta_pct: null, history_6mo: [0, 0, 0, 0, 0, 0] },
      });
    });

    it("isola falha de fleet_health quando a RPC falha", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const from = mockFrom({
        expenses: { data: [], error: null },
        vehicles: { data: [], count: 0, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock({ calculate_fleet_health: { data: null, error: { message: "boom" } } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.fleet_health).toEqual({ ok: false });
    });

    it("fleet_health usa fallback vazio quando data vem undefined sem erro", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const from = mockFrom({
        expenses: { data: [], error: null },
        vehicles: { data: [], count: 0, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock({ calculate_fleet_health: { data: undefined, error: null } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.fleet_health).toEqual({ ok: true, value: null });
    });

    it("isola falha de total_vehicles quando a query de contagem falha", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const from = mockFrom({
        expenses: { data: [], error: null },
        vehicles: { data: [], count: undefined, error: { message: "boom" } },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock();
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.total_vehicles).toEqual({ ok: false });
    });

    it("upcoming_costs_7d aplica fallback 0 quando amount vem null", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([{ amount: null }, { amount: 40 }]);
      const from = mockFrom({
        expenses: { data: [], error: null },
        vehicles: { data: [], count: 0, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock();
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.upcoming_costs_7d).toEqual({ ok: true, value: { total: 40, count: 2 } });
    });

    it("isola falha de expense_anomalies quando a RPC falha", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const from = mockFrom({
        expenses: { data: [], count: 5, error: null },
        vehicles: { data: [], count: 0, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock({ detect_expense_anomalies: { data: null, error: { message: "boom" } } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.expense_anomalies).toEqual({ ok: false });
    });

    it("expense_anomalies usa fallback vazio quando data vem undefined sem erro", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const from = mockFrom({
        expenses: { data: [], count: 5, error: null },
        vehicles: { data: [], count: 0, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock({ detect_expense_anomalies: { data: undefined, error: null } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.expense_anomalies).toEqual({
        ok: true,
        value: { count: 0, insufficient_sample: false },
      });
    });

    it("expense_anomalies conta apenas anomalias do mês corrente", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const today = new Date();
      const startOfMonth = toDateString(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
      const prevMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 15));
      const from = mockFrom({
        expenses: { data: [], count: 5, error: null },
        vehicles: { data: [], count: 0, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock({
        detect_expense_anomalies: {
          data: [{ date: startOfMonth }, { date: toDateString(prevMonth) }],
          error: null,
        },
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.expense_anomalies).toEqual({
        ok: true,
        value: { count: 1, insufficient_sample: false },
      });
    });

    it("expense_anomalies suprime a contagem quando o histórico total é menor que DELTA_SUPPRESSION_MIN_SAMPLE (RF-05, R-KPI-04)", async () => {
      (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
      const from = mockFrom({
        expenses: { data: [], count: 2, error: null },
        vehicles: { data: [], count: 0, error: null },
        maintenances: { count: 0, error: null, data: [] },
      });
      const rpc = buildRpcMock();
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

      expect(kpis.expense_anomalies).toEqual({
        ok: true,
        value: { count: 0, insufficient_sample: true },
      });
      expect(rpc).not.toHaveBeenCalledWith(
        "detect_expense_anomalies",
        expect.anything(),
      );
    });

    describe("spending_window (SPEC-20260804-001 RF-03, RF-04)", () => {
      it("soma as despesas retornadas e resolve label com a janela default de 7 dias", async () => {
        (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
        (preferencesService.findOne as jest.Mock).mockResolvedValueOnce({
          timezone: null,
          spending_window_days: 7,
        });
        const from = mockFrom({
          expenses: { data: [{ amount: 100 }, { amount: 50 }], error: null },
          vehicles: { data: [], count: 0, error: null },
          maintenances: { count: 0, error: null, data: [] },
        });
        const rpc = buildRpcMock();
        (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
        const service = createService();

        const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

        expect(kpis.spending_window).toEqual({
          ok: true,
          value: { value: 150, window_days: 7, label: "Últ. 7 dias" },
        });
      });

      it("usa o window_days configurado em user_preferences (14 dias) para o label (RF-03)", async () => {
        (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
        (preferencesService.findOne as jest.Mock).mockResolvedValueOnce({
          timezone: null,
          spending_window_days: 14,
        });
        const from = mockFrom({
          expenses: { data: [{ amount: 200 }], error: null },
          vehicles: { data: [], count: 0, error: null },
          maintenances: { count: 0, error: null, data: [] },
        });
        const rpc = buildRpcMock();
        (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
        const service = createService();

        const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

        expect(kpis.spending_window).toEqual({
          ok: true,
          value: { value: 200, window_days: 14, label: "Últ. 14 dias" },
        });
      });

      it("retorna 0 quando não há despesas na janela (US-01)", async () => {
        (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
        (preferencesService.findOne as jest.Mock).mockResolvedValueOnce({
          timezone: null,
          spending_window_days: 7,
        });
        const from = mockFrom({
          expenses: { data: [], error: null },
          vehicles: { data: [], count: 0, error: null },
          maintenances: { count: 0, error: null, data: [] },
        });
        const rpc = buildRpcMock();
        (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
        const service = createService();

        const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

        expect(kpis.spending_window).toEqual({
          ok: true,
          value: { value: 0, window_days: 7, label: "Últ. 7 dias" },
        });
      });

      it("isola falha da query de spending_window sem afetar os demais KPIs do catálogo", async () => {
        (expensesService.getUpcomingCosts as jest.Mock).mockResolvedValue([]);
        (preferencesService.findOne as jest.Mock).mockResolvedValueOnce({
          timezone: null,
          spending_window_days: 7,
        });
        const from = mockFrom({
          expenses: { data: null, error: { message: "boom" } },
          vehicles: { data: [], count: 0, error: null },
          maintenances: { count: 0, error: null, data: [] },
        });
        const rpc = buildRpcMock();
        (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
        const service = createService();

        const kpis = await service.getFleetKpiCatalog("token", "u1", undefined);

        expect(kpis.spending_window).toEqual({ ok: false });
        expect(kpis.total_vehicles.ok).toBe(true);
      });
    });
  });

  describe("getVehicleHistory (RF-DB-07)", () => {
    it("combina despesas e manutenções ordenadas por data decrescente", async () => {
      (expensesService.findAll as jest.Mock).mockResolvedValue({
        data: [
          { id: "e1", occurred_at: "2026-07-01", description: null, category: "fuel", amount: 100 },
        ],
      });
      (maintenancesService.findAll as jest.Mock).mockResolvedValue({
        data: [
          {
            id: "m1",
            completion_date: null,
            scheduled_date: "2026-07-10",
            description: "Troca de óleo",
            cost: 200,
          },
        ],
      });
      const service = createService();

      const history = await service.getVehicleHistory("token", "u1", "v1");

      expect(history).toEqual([
        { id: "m1", type: "maintenance", date: "2026-07-10", description: "Troca de óleo", amount: 200 },
        { id: "e1", type: "expense", date: "2026-07-01", description: "fuel", amount: 100 },
      ]);
    });

    it("usa description e completion_date quando presentes (sem fallback)", async () => {
      (expensesService.findAll as jest.Mock).mockResolvedValue({
        data: [
          { id: "e2", occurred_at: "2026-07-05", description: "Abastecimento", category: "fuel", amount: 100 },
        ],
      });
      (maintenancesService.findAll as jest.Mock).mockResolvedValue({
        data: [
          {
            id: "m2",
            completion_date: "2026-07-11",
            scheduled_date: "2026-07-10",
            description: "Troca de óleo",
            cost: 200,
          },
        ],
      });
      const service = createService();

      const history = await service.getVehicleHistory("token", "u1", "v1");

      expect(history).toEqual([
        { id: "m2", type: "maintenance", date: "2026-07-11", description: "Troca de óleo", amount: 200 },
        { id: "e2", type: "expense", date: "2026-07-05", description: "Abastecimento", amount: 100 },
      ]);
    });

    it("mantém a ordem original quando as datas são iguais", async () => {
      (expensesService.findAll as jest.Mock).mockResolvedValue({
        data: [{ id: "e3", occurred_at: "2026-07-10", description: "X", category: "fuel", amount: 10 }],
      });
      (maintenancesService.findAll as jest.Mock).mockResolvedValue({
        data: [
          {
            id: "m3",
            completion_date: "2026-07-10",
            scheduled_date: "2026-07-10",
            description: "Revisão",
            cost: 20,
          },
        ],
      });
      const service = createService();

      const history = await service.getVehicleHistory("token", "u1", "v1");

      expect(history.map((item) => item.id)).toEqual(["e3", "m3"]);
    });
  });

  describe("getSpendingHighlights (RF-01, P7)", () => {
    it("mapeia label pt-BR e arredonda o total para as categorias do catálogo padrão", async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: [
          { category: "fuel", total_amount: 150.505, expense_count: 3 },
          { category: "toll", total_amount: 42, expense_count: 1 },
        ],
        error: null,
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getSpendingHighlights("token", undefined, undefined);

      expect(result).toEqual([
        { category: "fuel", label: "Combustível", total_amount: 150.51, count: 3 },
        { category: "toll", label: "Pedágio", total_amount: 42, count: 1 },
      ]);
    });

    it("usa fallback capitalizado para categoria fora do catálogo padrão", async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: [{ category: "custom_cat", total_amount: 10, expense_count: 1 }],
        error: null,
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getSpendingHighlights("token", undefined, undefined);

      expect(result[0]!.label).toBe("Custom_cat");
    });

    it("repassa vehicleId e groupIds como parâmetros da RPC", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      await service.getSpendingHighlights("token", "veh1", ["g1", "g2"]);

      expect(rpc).toHaveBeenCalledWith("get_category_spending_highlights", {
        p_vehicle_id: "veh1",
        p_group_vehicle_ids: ["g1", "g2"],
      });
    });

    it("normaliza groupIds vazio/ausente para null na RPC", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      await service.getSpendingHighlights("token", undefined, []);

      expect(rpc).toHaveBeenCalledWith("get_category_spending_highlights", {
        p_vehicle_id: null,
        p_group_vehicle_ids: null,
      });
    });

    it("propaga erro da RPC", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      await expect(service.getSpendingHighlights("token", undefined, undefined)).rejects.toThrow("boom");
    });
  });

  describe("getFinesStatus (RF-02, R-SUB-03, R-SUB-04)", () => {
    it("retorna status 'none' quando não há multas ativas", async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: [{ active_count: 0, earliest_pending_due_date: null }],
        error: null,
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getFinesStatus("token", "u1");

      expect(result).toEqual({ status: "none", count: 0 });
    });

    it("retorna 'open' quando há multas ativas mas nenhuma pendente vencida", async () => {
      const future = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
      const rpc = jest.fn().mockResolvedValue({
        data: [{ active_count: 2, earliest_pending_due_date: future }],
        error: null,
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getFinesStatus("token", "u1");

      expect(result).toEqual({ status: "open", count: 2 });
    });

    it("retorna 'overdue' quando a multa pendente mais próxima já venceu (R-SUB-04)", async () => {
      const past = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
      const rpc = jest.fn().mockResolvedValue({
        data: [{ active_count: 3, earliest_pending_due_date: past }],
        error: null,
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getFinesStatus("token", "u1");

      expect(result).toEqual({ status: "overdue", count: 3 });
    });

    it("propaga erro da RPC", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      await expect(service.getFinesStatus("token", "u1")).rejects.toThrow("boom");
    });
  });

  describe("getFleetCharts (RF-08)", () => {
    const currentMonth = new Date().toISOString().slice(0, 7);

    function buildChartsRpcMock(overrides: Partial<Record<string, { data: unknown; error: unknown }>> = {}) {
      return jest.fn((fn: string) => {
        if (fn === "get_vehicle_cost_per_km") {
          return Promise.resolve(
            overrides.get_vehicle_cost_per_km ?? { data: [{ total_spent: 100, total_km: 200 }], error: null },
          );
        }
        if (fn === "get_category_spending_highlights") {
          return Promise.resolve(
            overrides.get_category_spending_highlights ?? {
              data: [{ category: "fuel", total_amount: 300, expense_count: 4 }],
              error: null,
            },
          );
        }
        return Promise.resolve({ data: null, error: { message: `rpc desconhecida: ${fn}` } });
      });
    }

    it("agrega custo/km, litros de combustível e breakdown de categorias (RNF-05 — independentes)", async () => {
      const from = mockFrom({
        vehicles: { data: [{ id: "v1" }], error: null },
        expenses: {
          data: [{ occurred_at: `${currentMonth}-10`, liters: 40 }],
          error: null,
        },
      });
      const rpc = buildChartsRpcMock();
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const result = await service.getFleetCharts("token", "u1");

      expect(result.cost_per_km[result.cost_per_km.length - 1]).toEqual({ month: currentMonth, value: 0.5 });
      expect(result.fuel_liters[result.fuel_liters.length - 1]).toEqual({ month: currentMonth, value: 40 });
      expect(result.category_breakdown).toEqual([
        { category: "fuel", label: "Combustível", total_amount: 300, count: 4 },
      ]);
      expect(rpc).toHaveBeenCalledWith("get_category_spending_highlights", {
        p_vehicle_id: null,
        p_group_vehicle_ids: null,
        p_limit: 50,
      });
    });

    it("cost_per_km fica 0 quando a frota não tem veículos", async () => {
      const from = mockFrom({
        vehicles: { data: [], error: null },
        expenses: { data: [], error: null },
      });
      const rpc = buildChartsRpcMock();
      (createUserScopedClient as jest.Mock).mockReturnValue({ from, rpc });
      const service = createService();

      const result = await service.getFleetCharts("token", "u1");

      expect(result.cost_per_km.every((point: { value: number }) => point.value === 0)).toBe(true);
    });
  });
});
