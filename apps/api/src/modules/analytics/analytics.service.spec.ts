import type { ConfigService } from "@nestjs/config";
import { AnalyticsService } from "./analytics.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("AnalyticsService", () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `stub-${key}`),
  } as unknown as ConfigService;

  function createService() {
    return new AnalyticsService(configService);
  }

  describe("getTco (RF-01, RF-07)", () => {
    it("retorna o TCO calculado pela RPC", async () => {
      const tco = {
        total: 1000,
        breakdown: { fuel: 400, maintenance: 300, fines: 100, recurring: 100, other: 100 },
        cost_per_km: 0.5,
        cost_per_month: 200,
        total_km: 2000,
        period_days: 150,
      };
      const rpc = jest.fn().mockResolvedValue({ data: tco, error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getTco("token", "v1");

      expect(rpc).toHaveBeenCalledWith("calculate_vehicle_tco", { p_vehicle_id: "v1" });
      expect(result).toEqual(tco);
    });

    it("lança NotFoundException quando a RPC falha (veículo inexistente ou de outro usuário)", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "unauthorized" } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      await expect(service.getTco("token", "v1")).rejects.toThrow("Veículo não encontrado");
    });
  });

  describe("getFuelTrend (RF-02, RF-08)", () => {
    it("retorna os pontos de tendência de consumo com o limit informado", async () => {
      const points = [
        {
          expense_id: "e1",
          date: "2026-07-01",
          liters: 40,
          amount: 240,
          odometer_km: 1000,
          km_per_liter: 12.5,
          price_per_liter: 6,
          rolling_avg_kpl: null,
        },
      ];
      const rpc = jest.fn().mockResolvedValue({ data: points, error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getFuelTrend("token", "v1", 20);

      expect(rpc).toHaveBeenCalledWith("fuel_consumption_trend", {
        p_vehicle_id: "v1",
        p_limit: 20,
      });
      expect(result).toEqual(points);
    });

    it("retorna array vazio quando a RPC não retorna dados", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getFuelTrend("token", "v1", 20);

      expect(result).toEqual([]);
    });

    it("lança NotFoundException quando a RPC falha", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "unauthorized" } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      await expect(service.getFuelTrend("token", "v1", 20)).rejects.toThrow(
        "Veículo não encontrado",
      );
    });
  });

  describe("getAnomalies (RF-03, RF-09)", () => {
    it("retorna as anomalias calculadas pela RPC com o threshold informado", async () => {
      const anomalies = [
        {
          expense_id: "e1",
          vehicle_id: "v1",
          category: "fuel",
          amount: 900,
          date: "2026-07-01",
          z_score: 3.2,
          avg_amount: 300,
          stddev_amount: 150,
        },
      ];
      const rpc = jest.fn().mockResolvedValue({ data: anomalies, error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getAnomalies("token", 2.0);

      expect(rpc).toHaveBeenCalledWith("detect_expense_anomalies", { p_threshold: 2.0 });
      expect(result).toEqual(anomalies);
    });

    it("filtra por vehicle_id quando informado (RF-09)", async () => {
      const anomalies = [
        { expense_id: "e1", vehicle_id: "v1", category: "fuel", amount: 900, date: "2026-07-01", z_score: 3.2, avg_amount: 300, stddev_amount: 150 },
        { expense_id: "e2", vehicle_id: "v2", category: "fuel", amount: 900, date: "2026-07-01", z_score: 3.2, avg_amount: 300, stddev_amount: 150 },
      ];
      const rpc = jest.fn().mockResolvedValue({ data: anomalies, error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getAnomalies("token", 2.0, "v1");

      expect(result).toEqual([anomalies[0]]);
    });

    it("lança NotFoundException quando a RPC falha", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "erro" } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      await expect(service.getAnomalies("token", 2.0)).rejects.toThrow(
        "Não foi possível calcular anomalias",
      );
    });
  });

  describe("getBenchmark (RF-04, RF-10)", () => {
    it("retorna o ranking calculado pela RPC", async () => {
      const benchmark = [
        {
          vehicle_id: "v1",
          plate: "ABC1234",
          vehicle_name: "Onix",
          total_expenses: 1000,
          total_km: 2000,
          cost_per_km: 0.5,
          avg_km_per_liter: 12,
          maintenance_count: 1,
          fines_count: 0,
          health_score: 90,
          efficiency_rank: 1,
        },
      ];
      const rpc = jest.fn().mockResolvedValue({ data: benchmark, error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getBenchmark("token");

      expect(rpc).toHaveBeenCalledWith("fleet_benchmark");
      expect(result).toEqual(benchmark);
    });

    it("lança NotFoundException quando a RPC falha", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "erro" } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      await expect(service.getBenchmark("token")).rejects.toThrow(
        "Não foi possível calcular o benchmark da frota",
      );
    });
  });

  describe("getForecast (RF-05, RF-11)", () => {
    it("retorna os pontos de projeção calculados pela RPC", async () => {
      const points = [
        { month: "2026-07-01", projected_amount: 1000, projected_low: 1000, projected_high: 1000, is_forecast: false },
      ];
      const rpc = jest.fn().mockResolvedValue({ data: points, error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getForecast("token", "v1", 3);

      expect(rpc).toHaveBeenCalledWith("forecast_monthly_costs", {
        p_vehicle_id: "v1",
        p_months_ahead: 3,
      });
      expect(result).toEqual(points);
    });

    it("envia p_vehicle_id null quando a frota inteira é solicitada", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      await service.getForecast("token", undefined, 3);

      expect(rpc).toHaveBeenCalledWith("forecast_monthly_costs", {
        p_vehicle_id: null,
        p_months_ahead: 3,
      });
    });

    it("lança NotFoundException quando a RPC falha", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "erro" } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      await expect(service.getForecast("token", "v1", 3)).rejects.toThrow(
        "Não foi possível calcular a projeção de custos",
      );
    });
  });

  describe("getSeasonal (RF-06, RF-12)", () => {
    it("retorna o heatmap calculado pela RPC", async () => {
      const cells = [{ month_number: 1, category: "fuel", avg_amount: 300, occurrence_count: 4 }];
      const rpc = jest.fn().mockResolvedValue({ data: cells, error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getSeasonal("token", "v1");

      expect(rpc).toHaveBeenCalledWith("seasonal_expense_heatmap", { p_vehicle_id: "v1" });
      expect(result).toEqual(cells);
    });

    it("lança NotFoundException quando a RPC falha", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "erro" } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      await expect(service.getSeasonal("token")).rejects.toThrow(
        "Não foi possível calcular a sazonalidade de gastos",
      );
    });
  });

  describe("getCategorySeries (SPEC-20260801-002 RF-03)", () => {
    it("retorna a série mensal por categoria calculada pela RPC", async () => {
      const series = [
        { year_month: "2026-07-01", category: "fuel", total: 500, vehicle_id: "v1" },
      ];
      const rpc = jest.fn().mockResolvedValue({ data: series, error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getCategorySeries("token", "v1");

      expect(rpc).toHaveBeenCalledWith("expense_category_monthly_series", {
        p_vehicle_id: "v1",
      });
      expect(result).toEqual(series);
    });

    it("retorna array vazio quando a RPC não retorna dados", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const result = await service.getCategorySeries("token");

      expect(result).toEqual([]);
    });

    it("lança NotFoundException quando a RPC falha", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "erro" } });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      await expect(service.getCategorySeries("token")).rejects.toThrow(
        "Não foi possível calcular a série mensal por categoria",
      );
    });
  });

  describe("getInsights (RF-14)", () => {
    function createChainableBuilder(result: { data: unknown; error: unknown }) {
      const builder: Record<string, jest.Mock> & PromiseLike<{ data: unknown; error: unknown }> =
        {} as never;
      for (const method of ["select", "eq", "is", "not", "gte", "lte", "order"]) {
        // eslint-disable-next-line security/detect-object-injection -- method vem de array literal fixo, não de input externo
        builder[method] = jest.fn(() => builder);
      }
      builder.limit = jest.fn(() => Promise.resolve(result));
      builder.then = ((resolve: (value: { data: unknown; error: unknown }) => unknown) =>
        Promise.resolve(result).then(resolve)) as never;
      return builder;
    }

    function createClient(config: {
      benchmark?: unknown[];
      fuelTrend?: unknown[];
      fines?: unknown[];
      fuelExpenses?: unknown[];
      forecast?: unknown[];
    }) {
      const rpc = jest.fn((fn: string) => {
        if (fn === "fleet_benchmark") return Promise.resolve({ data: config.benchmark ?? [], error: null });
        if (fn === "fuel_consumption_trend")
          return Promise.resolve({ data: config.fuelTrend ?? [], error: null });
        if (fn === "forecast_monthly_costs")
          return Promise.resolve({ data: config.forecast ?? [], error: null });
        return Promise.resolve({ data: [], error: null });
      });
      const builders = new Map<string, ReturnType<typeof createChainableBuilder>>();
      const from = jest.fn((table: string) => {
        if (!builders.has(table)) {
          const result =
            table === "fines"
              ? { data: config.fines ?? [], error: null }
              : table === "expenses"
                ? { data: config.fuelExpenses ?? [], error: null }
                : { data: [], error: null };
          builders.set(table, createChainableBuilder(result));
        }
        return builders.get(table);
      });
      return { rpc, from };
    }

    const BENCHMARK_ENTRY = {
      vehicle_id: "v1",
      plate: "ABC1234",
      vehicle_name: "Onix",
      total_expenses: 1000,
      total_km: 2000,
      cost_per_km: 2.0,
      avg_km_per_liter: 10,
      maintenance_count: 0,
      fines_count: 0,
      health_score: 90,
      efficiency_rank: 1,
    };
    const BENCHMARK_ENTRY_AVG = { ...BENCHMARK_ENTRY, vehicle_id: "v2", cost_per_km: 0.5 };

    it("gera insight de eficiência quando custo/km > 1.5x a média da frota", async () => {
      const client = createClient({ benchmark: [BENCHMARK_ENTRY, BENCHMARK_ENTRY_AVG] });
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      const service = createService();

      const result = await service.getInsights("token", "user-1");

      expect(result).toContainEqual(
        expect.objectContaining({ type: "efficiency", vehicle_id: "v1" }),
      );
    });

    it("gera insight de degradação de consumo quando rolling_avg_kpl cai mais de 15%", async () => {
      const client = createClient({
        benchmark: [BENCHMARK_ENTRY],
        fuelTrend: [
          { expense_id: "e2", date: "2026-07-10", rolling_avg_kpl: 8 },
          { expense_id: "e1", date: "2026-07-01", rolling_avg_kpl: 10 },
        ],
      });
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      const service = createService();

      const result = await service.getInsights("token", "user-1");

      expect(result).toContainEqual(
        expect.objectContaining({ type: "fuel_degradation", vehicle_id: "v1" }),
      );
    });

    it("gera insight de multas pendentes com desconto próximo", async () => {
      const client = createClient({
        fines: [{ amount: 200, amount_with_discount: 150, due_date: "2026-07-20" }],
      });
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      const service = createService();

      const result = await service.getInsights("token", "user-1");

      expect(result).toContainEqual(expect.objectContaining({ type: "fines_discount" }));
    });

    it("gera insight de fornecedor mais barato quando há economia real", async () => {
      const client = createClient({
        fuelExpenses: [
          { supplier: "Posto A", amount: 100, liters: 10, date: "2026-06-01" },
          { supplier: "Posto A", amount: 100, liters: 10, date: "2026-07-01" },
          { supplier: "Posto B", amount: 60, liters: 10, date: "2026-07-05" },
        ],
      });
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      const service = createService();

      const result = await service.getInsights("token", "user-1");

      expect(result).toContainEqual(
        expect.objectContaining({ type: "cheaper_supplier", message: expect.stringContaining("Posto B") }),
      );
    });

    it("gera insight de projeção quando o próximo mês projetado supera 120% do mês anterior", async () => {
      const client = createClient({
        forecast: [
          { month: "2026-06-01", projected_amount: 1000, projected_low: 1000, projected_high: 1000, is_forecast: false },
          { month: "2026-07-01", projected_amount: 1500, projected_low: 1300, projected_high: 1700, is_forecast: true },
        ],
      });
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      const service = createService();

      const result = await service.getInsights("token", "user-1");

      expect(result).toContainEqual(expect.objectContaining({ type: "forecast_increase" }));
    });

    it("retorna array vazio quando nenhum trigger é acionado", async () => {
      const client = createClient({});
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      const service = createService();

      const result = await service.getInsights("token", "user-1");

      expect(result).toEqual([]);
    });

    it("escopa o benchmark, as multas e os abastecimentos por vehicleId quando informado", async () => {
      const client = createClient({
        benchmark: [BENCHMARK_ENTRY, BENCHMARK_ENTRY_AVG],
        fines: [{ amount: 200, amount_with_discount: 150, due_date: "2026-07-20" }],
      });
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      const service = createService();

      const result = await service.getInsights("token", "user-1", "v1");

      expect(result).toContainEqual(
        expect.objectContaining({ type: "efficiency", vehicle_id: "v1" }),
      );
      const finesBuilder = client.from("fines") as unknown as Record<string, jest.Mock>;
      expect(finesBuilder.eq).toHaveBeenCalledWith("vehicle_id", "v1");
      const expensesBuilder = client.from("expenses") as unknown as Record<string, jest.Mock>;
      expect(expensesBuilder.eq).toHaveBeenCalledWith("vehicle_id", "v1");
    });
  });

  describe("exportCsv (RF-16)", () => {
    it("inclui o breakdown de TCO do veículo quando vehicleId é informado", async () => {
      const tco = {
        total: 1000,
        breakdown: { fuel: 400, maintenance: 300, fines: 100, recurring: 100, other: 100 },
        cost_per_km: 0.5,
        cost_per_month: 200,
        total_km: 2000,
        period_days: 150,
      };
      const rpc = jest.fn((fn: string) => {
        if (fn === "calculate_vehicle_tco") return Promise.resolve({ data: tco, error: null });
        if (fn === "forecast_monthly_costs") return Promise.resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const csv = await service.exportCsv("token", "v1");

      expect(csv).toContain("Categoria,Valor");
      expect(csv).toContain("Combustivel,400.00");
      expect(csv).toContain("Forecast");
    });

    it("inclui totais por veículo do benchmark quando vehicleId não é informado", async () => {
      const rpc = jest.fn((fn: string) => {
        if (fn === "fleet_benchmark")
          return Promise.resolve({
            data: [
              {
                vehicle_id: "v1",
                plate: "ABC1234",
                vehicle_name: "Onix",
                total_expenses: 1000,
                total_km: 2000,
                cost_per_km: 0.5,
                avg_km_per_liter: 10,
                maintenance_count: 0,
                fines_count: 0,
                health_score: 90,
                efficiency_rank: 1,
              },
            ],
            error: null,
          });
        if (fn === "forecast_monthly_costs") return Promise.resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const csv = await service.exportCsv("token");

      expect(csv).toContain("Veiculo,Total,Custo/km");
      expect(csv).toContain("Onix,1000.00,0.50");
    });

    it("marca cada linha do forecast como Projetado ou Historico conforme is_forecast", async () => {
      const rpc = jest.fn((fn: string) => {
        if (fn === "fleet_benchmark") return Promise.resolve({ data: [], error: null });
        if (fn === "forecast_monthly_costs")
          return Promise.resolve({
            data: [
              { month: "2026-06-01", projected_amount: 1000, projected_low: 1000, projected_high: 1000, is_forecast: false },
              { month: "2026-07-01", projected_amount: 1200, projected_low: 1100, projected_high: 1300, is_forecast: true },
            ],
            error: null,
          });
        return Promise.resolve({ data: [], error: null });
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const csv = await service.exportCsv("token");

      expect(csv).toContain("2026-06-01,1000.00,1000.00,1000.00,Historico");
      expect(csv).toContain("2026-07-01,1200.00,1100.00,1300.00,Projetado");
    });

    it("degrada com cabeçalho vazio quando o benchmark da frota falha", async () => {
      const rpc = jest.fn((fn: string) => {
        if (fn === "fleet_benchmark") return Promise.resolve({ data: null, error: { message: "boom" } });
        if (fn === "forecast_monthly_costs") return Promise.resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });
      (createUserScopedClient as jest.Mock).mockReturnValue({ rpc });
      const service = createService();

      const csv = await service.exportCsv("token");

      expect(csv).toContain("Veiculo,Total,Custo/km");
      expect(csv).not.toContain("Onix");
    });
  });
});
