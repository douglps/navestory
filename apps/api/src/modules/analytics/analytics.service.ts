import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  AnalyticsInsight,
  ExpenseAnomaly,
  FleetBenchmarkEntry,
  FuelTrendPoint,
  MonthlyForecastPoint,
  SeasonalHeatmapCell,
  VehicleTco,
} from "@nave/validators";
import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeCsvField } from "../../shared/csv/csv.util";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

const FINES_DISCOUNT_HORIZON_DAYS = 7;
const FUEL_DEGRADATION_THRESHOLD = 0.85;
const EFFICIENCY_THRESHOLD = 1.5;
const FORECAST_INCREASE_THRESHOLD = 1.2;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysUntil(dateStr: string, today: Date): number {
  const due = Date.parse(`${dateStr}T00:00:00Z`);
  const todayMidnightUtc = Date.parse(`${toDateString(today)}T00:00:00Z`);
  return Math.round((due - todayMidnightUtc) / 86_400_000);
}

function monthsBetween(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(months, 1);
}

function formatMonthLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface FuelExpenseRow {
  supplier: string;
  amount: number;
  liters: number;
  occurred_at: string;
}

interface SupplierAggregate {
  totalPrice: number;
  count: number;
  totalLiters: number;
  firstDate: string;
  lastDate: string;
}

interface FineRow {
  amount: number;
  amount_with_discount: number | null;
  due_date: string;
}

/**
 * @spec SPEC-20260622-001
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly configService: ConfigService) {}

  private clientForUser(accessToken: string): SupabaseClient {
    return createUserScopedClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      accessToken,
    );
  }

  /**
   * @spec SPEC-20260622-001 RF-01, RF-07
   */
  async getTco(accessToken: string, vehicleId: string): Promise<VehicleTco> {
    const { data, error } = await this.clientForUser(accessToken).rpc("calculate_vehicle_tco", {
      p_vehicle_id: vehicleId,
    });

    if (error) {
      throw new NotFoundException("Veículo não encontrado");
    }
    return data as VehicleTco;
  }

  /**
   * @spec SPEC-20260622-001 RF-02, RF-08
   */
  async getFuelTrend(
    accessToken: string,
    vehicleId: string,
    limit: number,
  ): Promise<FuelTrendPoint[]> {
    const { data, error } = await this.clientForUser(accessToken).rpc("fuel_consumption_trend", {
      p_vehicle_id: vehicleId,
      p_limit: limit,
    });

    if (error) {
      throw new NotFoundException("Veículo não encontrado");
    }
    return (data ?? []) as FuelTrendPoint[];
  }

  /**
   * @spec SPEC-20260622-001 RF-03, RF-09, R-ANA-02
   */
  async getAnomalies(
    accessToken: string,
    threshold: number,
    vehicleId?: string,
  ): Promise<ExpenseAnomaly[]> {
    const { data, error } = await this.clientForUser(accessToken).rpc("detect_expense_anomalies", {
      p_threshold: threshold,
    });

    if (error) {
      throw new NotFoundException("Não foi possível calcular anomalias");
    }
    const anomalies = (data ?? []) as ExpenseAnomaly[];
    return vehicleId ? anomalies.filter((anomaly) => anomaly.vehicle_id === vehicleId) : anomalies;
  }

  /**
   * @spec SPEC-20260622-001 RF-04, RF-10
   */
  async getBenchmark(accessToken: string): Promise<FleetBenchmarkEntry[]> {
    const { data, error } = await this.clientForUser(accessToken).rpc("fleet_benchmark");

    if (error) {
      throw new NotFoundException("Não foi possível calcular o benchmark da frota");
    }
    return (data ?? []) as FleetBenchmarkEntry[];
  }

  /**
   * @spec SPEC-20260622-001 RF-05, RF-11, R-ANA-03
   */
  async getForecast(
    accessToken: string,
    vehicleId: string | undefined,
    months: number,
  ): Promise<MonthlyForecastPoint[]> {
    const { data, error } = await this.clientForUser(accessToken).rpc("forecast_monthly_costs", {
      p_vehicle_id: vehicleId ?? null,
      p_months_ahead: months,
    });

    if (error) {
      throw new NotFoundException("Não foi possível calcular a projeção de custos");
    }
    return (data ?? []) as MonthlyForecastPoint[];
  }

  /**
   * @spec SPEC-20260622-001 RF-06, RF-12, R-ANA-07
   */
  async getSeasonal(accessToken: string, vehicleId?: string): Promise<SeasonalHeatmapCell[]> {
    const { data, error } = await this.clientForUser(accessToken).rpc("seasonal_expense_heatmap", {
      p_vehicle_id: vehicleId ?? null,
    });

    if (error) {
      throw new NotFoundException("Não foi possível calcular a sazonalidade de gastos");
    }
    return (data ?? []) as SeasonalHeatmapCell[];
  }

  /**
   * @spec SPEC-20260622-001 RF-14, R-ANA-05
   * Combina benchmark, tendência de combustível, multas pendentes, comparação de fornecedores e
   * projeção — cada trigger é independente; a ausência de dados para um deles apenas omite o
   * insight correspondente (nunca gera erro para o conjunto).
   */
  async getInsights(
    accessToken: string,
    userId: string,
    vehicleId?: string,
  ): Promise<AnalyticsInsight[]> {
    const client = this.clientForUser(accessToken);

    const [benchmarkResult, forecastPoints] = await Promise.all([
      client.rpc("fleet_benchmark"),
      this.getForecast(accessToken, vehicleId, 3),
    ]);

    const benchmark = (benchmarkResult.data ?? []) as FleetBenchmarkEntry[];
    const scopedVehicles = (vehicleId
      ? benchmark.filter((entry) => entry.vehicle_id === vehicleId)
      : benchmark
    ).map((entry) => ({ vehicle_id: entry.vehicle_id, plate: entry.plate }));

    const [fuelInsights, finesInsight, supplierInsight] = await Promise.all([
      this.buildFuelDegradationInsights(client, scopedVehicles),
      this.buildFinesInsight(client, userId, vehicleId),
      this.buildSupplierInsight(client, userId, vehicleId),
    ]);

    const insights: AnalyticsInsight[] = [
      ...this.buildEfficiencyInsights(benchmark, vehicleId),
      ...fuelInsights,
    ];
    if (finesInsight) insights.push(finesInsight);
    if (supplierInsight) insights.push(supplierInsight);

    const forecastInsight = this.buildForecastInsight(forecastPoints);
    if (forecastInsight) insights.push(forecastInsight);

    return insights;
  }

  /**
   * @spec SPEC-20260622-001 RF-16
   * Escopo do CSV: TCO breakdown (ou totais por veículo, quando `vehicleId` não é informado) +
   * forecast mensal — as tabelas mais úteis para compartilhar com gestão.
   */
  async exportCsv(accessToken: string, vehicleId?: string): Promise<string> {
    const client = this.clientForUser(accessToken);

    const [tcoRows, forecastPoints] = await Promise.all([
      this.buildTcoCsvRows(client, accessToken, vehicleId),
      this.getForecast(accessToken, vehicleId, 3),
    ]);

    const forecastRows = forecastPoints.map((point) =>
      [
        point.month,
        point.projected_amount.toFixed(2),
        point.projected_low.toFixed(2),
        point.projected_high.toFixed(2),
        point.is_forecast ? "Projetado" : "Historico",
      ].join(","),
    );

    return (
      [
        "TCO",
        ...tcoRows,
        "",
        "Forecast",
        "Mes,Valor Projetado,Minimo,Maximo,Tipo",
        ...forecastRows,
      ].join("\n") + "\n"
    );
  }

  private async buildTcoCsvRows(
    client: SupabaseClient,
    accessToken: string,
    vehicleId: string | undefined,
  ): Promise<string[]> {
    if (vehicleId) {
      const tco = await this.getTco(accessToken, vehicleId);
      const breakdown = tco.breakdown;
      return [
        "Categoria,Valor",
        `Combustivel,${breakdown.fuel.toFixed(2)}`,
        `Manutencao,${breakdown.maintenance.toFixed(2)}`,
        `Multas,${breakdown.fines.toFixed(2)}`,
        `Custos Recorrentes,${breakdown.recurring.toFixed(2)}`,
        `Outros,${breakdown.other.toFixed(2)}`,
      ];
    }

    const { data, error } = await client.rpc("fleet_benchmark");
    if (error) {
      return ["Veiculo,Total,Custo/km"];
    }
    const benchmark = (data ?? []) as FleetBenchmarkEntry[];
    return [
      "Veiculo,Total,Custo/km",
      ...benchmark.map(
        (entry) =>
          `${escapeCsvField(entry.vehicle_name)},${entry.total_expenses.toFixed(2)},${
            entry.cost_per_km == null ? "" : entry.cost_per_km.toFixed(2)
          }`,
      ),
    ];
  }

  /**
   * @spec SPEC-20260622-001 RF-14 — trigger "custo/km > 1.5x média da frota"
   */
  private buildEfficiencyInsights(
    benchmark: FleetBenchmarkEntry[],
    vehicleId: string | undefined,
  ): AnalyticsInsight[] {
    const withCost = benchmark.filter(
      (entry): entry is FleetBenchmarkEntry & { cost_per_km: number } => entry.cost_per_km != null,
    );
    if (withCost.length === 0) return [];

    const avg = withCost.reduce((sum, entry) => sum + entry.cost_per_km, 0) / withCost.length;
    if (avg <= 0) return [];

    const scoped = vehicleId ? withCost.filter((entry) => entry.vehicle_id === vehicleId) : withCost;

    return scoped
      .filter((entry) => entry.cost_per_km > avg * EFFICIENCY_THRESHOLD)
      .map((entry) => {
        const pctAbove = Math.round(((entry.cost_per_km - avg) / avg) * 100);
        return {
          type: "efficiency",
          vehicle_id: entry.vehicle_id,
          message: `O veículo ${entry.plate} tem custo/km ${pctAbove}% acima da média. Considere revisão.`,
        };
      });
  }

  /**
   * @spec SPEC-20260622-001 RF-14 — trigger "km/L caindo > 15% nos últimos 5 registros"
   */
  private async buildFuelDegradationInsights(
    client: SupabaseClient,
    vehicles: { vehicle_id: string; plate: string }[],
  ): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    for (const vehicle of vehicles) {
      const { data, error } = await client.rpc("fuel_consumption_trend", {
        p_vehicle_id: vehicle.vehicle_id,
        p_limit: 10,
      });
      if (error) continue;

      const withRolling = ((data ?? []) as FuelTrendPoint[]).filter(
        (point): point is FuelTrendPoint & { rolling_avg_kpl: number } => point.rolling_avg_kpl != null,
      );
      if (withRolling.length < 2) continue;

      const latest = withRolling[0];
      const previous = withRolling[1];
      if (!latest || !previous) continue;
      if (latest.rolling_avg_kpl < previous.rolling_avg_kpl * FUEL_DEGRADATION_THRESHOLD) {
        insights.push({
          type: "fuel_degradation",
          vehicle_id: vehicle.vehicle_id,
          message: `O consumo do ${vehicle.plate} está piorando. Última média: ${latest.rolling_avg_kpl.toFixed(
            1,
          )} km/L vs. anterior: ${previous.rolling_avg_kpl.toFixed(1)} km/L.`,
        });
      }
    }

    return insights;
  }

  /**
   * @spec SPEC-20260622-001 RF-14 — trigger "multas pendentes com desconto próximo"
   */
  private async buildFinesInsight(
    client: SupabaseClient,
    userId: string,
    vehicleId: string | undefined,
  ): Promise<AnalyticsInsight | null> {
    const today = new Date();
    const horizon = addDays(today, FINES_DISCOUNT_HORIZON_DAYS);

    let builder = client
      .from("fines")
      .select("amount, amount_with_discount, due_date")
      .eq("user_id", userId)
      .eq("status", "pending")
      .is("deleted_at", null)
      .not("amount_with_discount", "is", null)
      .not("due_date", "is", null)
      .gte("due_date", toDateString(today))
      .lte("due_date", toDateString(horizon));

    if (vehicleId) {
      builder = builder.eq("vehicle_id", vehicleId);
    }

    const { data, error } = await builder;
    if (error || !data || data.length === 0) return null;

    const rows = data as FineRow[];
    const firstRow = rows[0];
    if (!firstRow) return null;
    const total = rows.reduce((sum, row) => sum + (row.amount_with_discount ?? row.amount), 0);
    const nearestDueDate = rows.reduce(
      (min, row) => (row.due_date < min ? row.due_date : min),
      firstRow.due_date,
    );
    const days = Math.max(daysUntil(nearestDueDate, today), 0);

    return {
      type: "fines_discount",
      vehicle_id: vehicleId ?? null,
      message: `Você tem ${rows.length} multa${rows.length > 1 ? "s" : ""} totalizando ${currency(
        total,
      )}. Desconto vence em ${days} dias.`,
    };
  }

  /**
   * @spec SPEC-20260622-001 RF-14 — trigger "fornecedor mais barato detectado"
   */
  private async buildSupplierInsight(
    client: SupabaseClient,
    userId: string,
    vehicleId: string | undefined,
  ): Promise<AnalyticsInsight | null> {
    let builder = client
      .from("expenses")
      .select("supplier, amount, liters, occurred_at")
      .eq("user_id", userId)
      .eq("category", "fuel")
      .is("deleted_at", null)
      .not("supplier", "is", null)
      .not("liters", "is", null);

    if (vehicleId) {
      builder = builder.eq("vehicle_id", vehicleId);
    }

    const { data, error } = await builder.order("occurred_at", { ascending: false }).limit(200);
    if (error || !data) return null;

    const bySupplier = new Map<string, SupplierAggregate>();
    for (const row of data as FuelExpenseRow[]) {
      if (!row.liters || row.liters <= 0) continue;
      const price = row.amount / row.liters;
      const entry = bySupplier.get(row.supplier) ?? {
        totalPrice: 0,
        count: 0,
        totalLiters: 0,
        firstDate: row.occurred_at,
        lastDate: row.occurred_at,
      };
      entry.totalPrice += price;
      entry.count += 1;
      entry.totalLiters += row.liters;
      if (row.occurred_at < entry.firstDate) entry.firstDate = row.occurred_at;
      if (row.occurred_at > entry.lastDate) entry.lastDate = row.occurred_at;
      bySupplier.set(row.supplier, entry);
    }

    if (bySupplier.size < 2) return null;

    let mostUsed: { supplier: string; avgPrice: number; count: number } | null = null;
    let cheapest: { supplier: string; avgPrice: number } | null = null;

    for (const [supplier, entry] of bySupplier) {
      const avgPrice = entry.totalPrice / entry.count;
      if (!mostUsed || entry.count > mostUsed.count) {
        mostUsed = { supplier, avgPrice, count: entry.count };
      }
      if (!cheapest || avgPrice < cheapest.avgPrice) {
        cheapest = { supplier, avgPrice };
      }
    }

    if (!mostUsed || !cheapest || cheapest.supplier === mostUsed.supplier) return null;
    if (cheapest.avgPrice >= mostUsed.avgPrice) return null;

    const currentEntry = bySupplier.get(mostUsed.supplier);
    if (!currentEntry) return null;

    const monthsSpan = monthsBetween(currentEntry.firstDate, currentEntry.lastDate);
    const litersPerMonth = currentEntry.totalLiters / monthsSpan;
    const monthlySavings = round2((mostUsed.avgPrice - cheapest.avgPrice) * litersPerMonth);
    if (monthlySavings <= 0) return null;

    return {
      type: "cheaper_supplier",
      vehicle_id: vehicleId ?? null,
      message: `Abastecendo no ${cheapest.supplier}, você economizaria ~${currency(
        monthlySavings,
      )}/mês vs. média atual.`,
    };
  }

  /**
   * @spec SPEC-20260622-001 RF-14 — trigger "projeção > 120% do mês anterior"
   */
  private buildForecastInsight(points: MonthlyForecastPoint[]): AnalyticsInsight | null {
    const firstForecastIndex = points.findIndex((point) => point.is_forecast);
    if (firstForecastIndex <= 0) return null;

    // eslint-disable-next-line security/detect-object-injection -- índice derivado de findIndex/aritmética, não de input externo
    const forecastPoint = points[firstForecastIndex];
    const previousPoint = points[firstForecastIndex - 1];
    if (!forecastPoint || !previousPoint || previousPoint.projected_amount <= 0) return null;

    const ratio = forecastPoint.projected_amount / previousPoint.projected_amount;
    if (ratio <= FORECAST_INCREASE_THRESHOLD) return null;

    const pct = Math.round((ratio - 1) * 100);
    return {
      type: "forecast_increase",
      vehicle_id: null,
      message: `Projeção de custos para ${formatMonthLabel(forecastPoint.month)}: ${currency(
        forecastPoint.projected_amount,
      )} (+${pct}% vs. atual).`,
    };
  }
}
