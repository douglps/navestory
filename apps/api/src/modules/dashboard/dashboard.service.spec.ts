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
  };
  const maintenancesService = {
    findAll: jest.fn(),
  };

  function createService() {
    return new DashboardService(
      supabaseAdmin,
      configService,
      expensesService as never,
      maintenancesService as never,
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
          date: "2026-05-10",
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

  it("escapa campos com vírgula ou aspas (CA-04)", async () => {
    mockClient({
      data: [
        {
          date: "2026-05-10",
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
    for (const method of ["select", "eq", "is", "in", "gte", "lte", "order", "limit", "not"]) {
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

    it("lança NotFoundException quando a RPC falha", async () => {
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

    it("lança NotFoundException quando a query falha", async () => {
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
        return createQueryBuilder({ data: [{ date: "2026-07-01", amount: 200 }], error: null });
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ from });
      const service = createService();

      const cards = await service.getVehicleCards("token", "u1");

      expect(cards).toHaveLength(2);
      expect(cards[0]?.documents).toEqual({ ipva: "overdue", insurance: "attention", crlv: "ok" });
      expect(cards[0]?.last_fuel_date).toBe("2026-07-01");
      expect(cards[1]?.documents).toEqual({ ipva: "unknown", insurance: "unknown", crlv: "unknown" });
    });
  });
});
