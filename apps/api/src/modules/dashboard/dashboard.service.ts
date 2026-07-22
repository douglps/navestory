import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  type CategorySummaryItem,
  type DocumentStatus,
  type FinesStatusResponse,
  type FleetAlert,
  type FleetHealthEntry,
  type FleetKpiCatalog,
  type FleetKpis,
  type KpiResult,
  type KpiSeriesValue,
  type VehicleCard,
  type VehicleDocumentsStatus,
  type VehicleHistoryItem,
} from "@nave/validators";
import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeCsvField } from "../../shared/csv/csv.util";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";
import { FALLBACK_TIMEZONE, exclusiveDayUpperBoundUtc, toCalendarDay } from "../../shared/utils/date.utils";
import { ExpensesService } from "../expenses/expenses.service";
import { MaintenancesService } from "../maintenances/maintenances.service";
import { PreferencesService } from "../preferences/preferences.service";

const HISTORY_LIMIT = 20;

const ALERT_HORIZON_DAYS = 7;
const DOCUMENT_ATTENTION_DAYS = 30;

/** @spec SPEC-20260721-002 RF-01 — janela de série histórica dos KPIs com sparkline */
const KPI_SERIES_MONTHS = 6;
/** @spec SPEC-20260721-002 R-KPI-02 */
const DELTA_SUPPRESSION_MIN_SAMPLE = 3;
/** @spec SPEC-20260721-002 RF-01 — horizonte fixo do KPI "compromissos próximos 7 dias" */
const UPCOMING_COSTS_KPI_HORIZON_DAYS = 7;
/** @spec SPEC-20260622-001 R-ANA-02 — mesmo limiar de z-score usado em detect_expense_anomalies */
const ANOMALY_Z_SCORE_THRESHOLD = 2.0;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function addMonthsUtc(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

/**
 * @spec SPEC-20260721-002 RF-01
 * Últimos `count` meses (mês corrente incluso), do mais antigo para o mais recente — mesma
 * ordem esperada pelo sparkline de `KpiCard` (packages/ui).
 */
function recentMonthStarts(count: number, from: Date = new Date()): Date[] {
  const currentMonthStart = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const months: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    months.push(addMonthsUtc(currentMonthStart, -i));
  }
  return months;
}

/**
 * @spec SPEC-20260715-002 RF-BK-03, R-TZ-01
 * "Hoje" é sempre o dia calendário no fuso do usuário (`tz`), nunca UTC do servidor — corrige a
 * limitação residual do bug T5.1 (IMPACTO-033): perto da meia-noite UTC, um usuário em UTC-3 já
 * via o servidor considerar "amanhã" indevidamente.
 */
function daysUntil(dateStr: string, today: Date, tz: string): number {
  // `dateStr` pode ser `DATE` puro (documentos de veículo, fora do escopo da migração — o valor já
  // É o dia calendário, sem reinterpretação de fuso) ou `timestamptz` (manutenções, RF-BD-03) —
  // neste segundo caso o dia calendário é lido no fuso do usuário antes de comparar.
  const dueDay = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : toCalendarDay(new Date(dateStr), tz);
  const due = Date.parse(`${dueDay}T00:00:00Z`);
  const todayMidnightUtc = Date.parse(`${toCalendarDay(today, tz)}T00:00:00Z`);
  return Math.round((due - todayMidnightUtc) / 86_400_000);
}

function toKpiResult<T>(settled: PromiseSettledResult<T>): KpiResult<T> {
  return settled.status === "fulfilled" ? { ok: true, value: settled.value } : { ok: false };
}

function classifyDocument(dateStr: string | null, today: Date, tz: string): DocumentStatus {
  if (!dateStr) return "unknown";
  const days = daysUntil(dateStr, today, tz);
  if (days < 0) return "overdue";
  if (days <= DOCUMENT_ATTENTION_DAYS) return "attention";
  return "ok";
}

interface MaintenanceAlertRow {
  id: string;
  vehicle_id: string;
  description: string;
  scheduled_date: string;
  vehicles: { plate: string } | { plate: string }[] | null;
}

function resolvePlate(row: MaintenanceAlertRow): string {
  const vehicle = Array.isArray(row.vehicles) ? row.vehicles[0] : row.vehicles;
  return vehicle?.plate ?? "";
}

interface VehicleCardRow {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  nickname: string | null;
  odometer: number | null;
  ipva_due_date: string | null;
  insurance_expires_at: string | null;
  crlv_expires_at: string | null;
}

interface VehicleDocumentDatesRow {
  id: string;
  plate: string;
  ipva_due_date: string | null;
  insurance_expires_at: string | null;
  crlv_expires_at: string | null;
}

interface PaidRecurringCostRow {
  vehicle_id: string;
  cost_type: string;
}

/** @spec SPEC-20260531-001 RF-DB-06, CA-S3-02 — reconciliação vehicles.*_due_date vs vehicle_recurring_costs.paid_at */
const DOCUMENT_FIELD_TO_COST_TYPE = {
  ipva_due_date: "ipva",
  insurance_expires_at: "insurance",
  crlv_expires_at: "crlv",
} as const;

const DOCUMENT_LABEL: Record<keyof typeof DOCUMENT_FIELD_TO_COST_TYPE, string> = {
  ipva_due_date: "IPVA",
  insurance_expires_at: "Seguro",
  crlv_expires_at: "CRLV",
};

/**
 * @spec SPEC-20260722-004 Notas Técnicas — mapeamento category → label é responsabilidade do
 * backend (service), não do frontend, para manter o label consistente em toda a aplicação.
 * Categorias fora do catálogo padrão (personalizadas, fora de escopo desta spec) caem no
 * fallback capitalizado do próprio slug.
 */
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_EXPENSE_CATEGORIES.map((category) => [category.value, category.label]),
);

function categoryLabel(category: string): string {
  // eslint-disable-next-line security/detect-object-injection -- category vem de expenses.category (coluna do próprio usuário via RLS), não de input externo não sanitizado
  return CATEGORY_LABELS[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

interface CategorySpendingRpcRow {
  category: string;
  total_amount: number;
  expense_count: number;
}

interface FinesStatusRpcRow {
  active_count: number;
  earliest_pending_due_date: string | null;
}

const CSV_MAX_ROWS = 5_000;
const CSV_HEADER = "Data,Placa,Modelo,Categoria,Descricao,Valor";

interface ExpenseExportRow {
  occurred_at: string;
  amount: number;
  category: string;
  description: string | null;
  vehicles: { plate: string; model: string | null } | { plate: string; model: string | null }[] | null;
}

function lastDayOfMonth(period: string): string {
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const nextMonthFirstDay = new Date(Date.UTC(year, month, 1));
  const last = new Date(nextMonthFirstDay.getTime() - 1);
  return last.toISOString().slice(0, 10);
}

function resolveVehicle(row: ExpenseExportRow): { plate: string; model: string | null } {
  const vehicle = Array.isArray(row.vehicles) ? row.vehicles[0] : row.vehicles;
  return vehicle ?? { plate: "", model: null };
}

/**
 * @spec SPEC-20260521-003
 */
@Injectable()
export class DashboardService {
  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabaseAdmin: SupabaseClient,
    private readonly configService: ConfigService,
    private readonly expensesService: ExpensesService,
    private readonly maintenancesService: MaintenancesService,
    private readonly preferencesService: PreferencesService,
  ) {}

  private clientForUser(accessToken: string): SupabaseClient {
    return createUserScopedClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      accessToken,
    );
  }

  /** @spec SPEC-20260715-002 R-TZ-01, RF-BK-05 — fallback nomeado, nunca o fuso do processo */
  private async resolveUserTimezone(accessToken: string, userId: string): Promise<string> {
    const preferences = await this.preferencesService.findOne(accessToken, userId);
    return preferences.timezone ?? FALLBACK_TIMEZONE;
  }

  /**
   * @spec SPEC-20260521-003 RF-01, RF-02, RF-03, RF-04, RF-08, RNF-03
   */
  async exportExpensesCsv(
    accessToken: string,
    userId: string,
    period: string,
    vehicleId: string | undefined,
  ): Promise<string> {
    const client = this.clientForUser(accessToken);

    let builder = client
      .from("expenses")
      .select("occurred_at, amount, category, description, vehicles(plate, model)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("occurred_at", `${period}-01`)
      .lt("occurred_at", exclusiveDayUpperBoundUtc(lastDayOfMonth(period)));

    if (vehicleId) {
      builder = builder.eq("vehicle_id", vehicleId);
    }

    const { data, error } = await builder.order("occurred_at", { ascending: false }).limit(CSV_MAX_ROWS);

    if (error) {
      return `${CSV_HEADER}\n`;
    }

    const rows = ((data ?? []) as ExpenseExportRow[]).map((row) => {
      const vehicle = resolveVehicle(row);
      return [
        row.occurred_at.slice(0, 10),
        escapeCsvField(vehicle.plate),
        escapeCsvField(vehicle.model ?? ""),
        escapeCsvField(row.category),
        escapeCsvField(row.description ?? ""),
        row.amount.toFixed(2),
      ].join(",");
    });

    return [CSV_HEADER, ...rows].join("\n") + "\n";
  }

  /**
   * @spec SPEC-20260531-001 RF-SH-01, RF-SH-02
   * Consome a RPC já corrigida (20260712172220_fix_fleet_health_double_call.sql) — não recalcula
   * pesos no backend nem no frontend.
   */
  async getFleetHealth(accessToken: string, userId: string): Promise<FleetHealthEntry[]> {
    const { data, error } = await this.clientForUser(accessToken).rpc("calculate_fleet_health", {
      p_user_id: userId,
    });

    if (error) {
      throw new NotFoundException("Não foi possível calcular a saúde da frota");
    }
    return (data ?? []) as FleetHealthEntry[];
  }

  /**
   * @spec SPEC-20260531-001 RF-DA-01, RF-DA-02, CA-S3-02
   * Combina alertas de manutenção (vencida ou em até 7 dias) com alertas de documentos vencidos
   * (IPVA/Seguro/CRLV), reconciliados com `vehicle_recurring_costs.paid_at` do ano corrente (mesma
   * reconciliação de RF-DB-06) — documento pago não gera alerta. Lista final ordenada por urgência
   * (mais vencido primeiro) — o frontend recorta os 3 primeiros e monta o link "ver todos (+N)".
   */
  async getAlerts(accessToken: string, userId: string): Promise<FleetAlert[]> {
    const client = this.clientForUser(accessToken);
    const tz = await this.resolveUserTimezone(accessToken, userId);
    const today = new Date();
    const horizon = addDays(today, ALERT_HORIZON_DAYS);

    const [maintenanceResult, documentAlerts] = await Promise.all([
      client
        .from("maintenances")
        .select("id, vehicle_id, description, scheduled_date, vehicles(plate)")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .in("status", ["scheduled", "in_progress"])
        .lt("scheduled_date", exclusiveDayUpperBoundUtc(toCalendarDay(horizon, tz)))
        .order("scheduled_date", { ascending: true }),
      this.getDocumentOverdueAlerts(client, userId, today, tz),
    ]);

    if (maintenanceResult.error) {
      throw new NotFoundException("Não foi possível carregar os alertas da frota");
    }

    const maintenanceAlerts = ((maintenanceResult.data ?? []) as MaintenanceAlertRow[]).map((row) => {
      const daysUntilDue = daysUntil(row.scheduled_date, today, tz);
      return {
        id: row.id,
        type: daysUntilDue < 0 ? "maintenance_overdue" : "maintenance_upcoming",
        vehicle_id: row.vehicle_id,
        vehicle_plate: resolvePlate(row),
        description: row.description,
        due_date: row.scheduled_date,
        days_until_due: daysUntilDue,
      } satisfies FleetAlert;
    });

    return [...maintenanceAlerts, ...documentAlerts].sort(
      (a, b) => a.days_until_due - b.days_until_due,
    );
  }

  /**
   * @spec SPEC-20260531-001 RF-DA-01, RF-DB-06, CA-S3-02
   * Só documentos vencidos entram na barra de alertas (não "a vencer") — RF-DA-01 lista
   * explicitamente "documentos vencidos", diferente do badge "Atenção" da seção Docs (RF-DB-06,
   * horizonte de 30 dias, escopo de exibição, não de alerta).
   */
  private async getDocumentOverdueAlerts(
    client: SupabaseClient,
    userId: string,
    today: Date,
    tz: string,
  ): Promise<FleetAlert[]> {
    const [vehiclesResult, paidDocuments] = await Promise.all([
      client
        .from("vehicles")
        .select("id, plate, ipva_due_date, insurance_expires_at, crlv_expires_at")
        .eq("user_id", userId)
        .is("deleted_at", null),
      this.getPaidDocumentsCurrentYear(client, userId, today),
    ]);

    if (vehiclesResult.error) {
      throw new NotFoundException("Não foi possível carregar os alertas da frota");
    }

    const alerts: FleetAlert[] = [];
    for (const vehicle of (vehiclesResult.data ?? []) as VehicleDocumentDatesRow[]) {
      for (const field of Object.keys(DOCUMENT_FIELD_TO_COST_TYPE) as Array<
        keyof typeof DOCUMENT_FIELD_TO_COST_TYPE
      >) {
        // eslint-disable-next-line security/detect-object-injection -- field é keyof fixo, união de 3 literais
        const dueDate = vehicle[field];
        if (!dueDate) continue;

        const daysUntilDue = daysUntil(dueDate, today, tz);
        if (daysUntilDue >= 0) continue;

        // eslint-disable-next-line security/detect-object-injection -- field é keyof fixo, união de 3 literais
        const costType = DOCUMENT_FIELD_TO_COST_TYPE[field];
        if (paidDocuments.has(`${vehicle.id}:${costType}`)) continue;

        alerts.push({
          id: `document:${vehicle.id}:${costType}`,
          type: "document_overdue",
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          // eslint-disable-next-line security/detect-object-injection -- field é keyof fixo, união de 3 literais
          description: `${DOCUMENT_LABEL[field]} vencido`,
          due_date: dueDate,
          days_until_due: daysUntilDue,
        });
      }
    }
    return alerts;
  }

  private async getPaidDocumentsCurrentYear(
    client: SupabaseClient,
    userId: string,
    today: Date,
  ): Promise<Set<string>> {
    const { data, error } = await client
      .from("vehicle_recurring_costs")
      .select("vehicle_id, cost_type")
      .eq("user_id", userId)
      .eq("year", today.getUTCFullYear())
      .not("paid_at", "is", null)
      .is("deleted_at", null);

    if (error) {
      throw new NotFoundException("Não foi possível carregar os alertas da frota");
    }

    return new Set(
      ((data ?? []) as PaidRecurringCostRow[]).map((row) => `${row.vehicle_id}:${row.cost_type}`),
    );
  }

  /**
   * @spec SPEC-20260531-001 RF-DA-03
   * Cada KPI é calculado de forma independente (`Promise.allSettled`) — a falha de um não deve
   * impedir os demais de aparecer (CA-S1-05.1). `activeVehicleId` só afeta "Próxima manutenção";
   * os demais KPIs são sempre agregados de frota (ver nota em `fleetKpisQuerySchema`).
   */
  async getFleetKpis(
    accessToken: string,
    userId: string,
    activeVehicleId: string | undefined,
  ): Promise<FleetKpis> {
    const client = this.clientForUser(accessToken);
    const tz = await this.resolveUserTimezone(accessToken, userId);

    const [totalThisMonth, urgentCount, costPerKm, nextMaintenance] = await Promise.allSettled([
      this.expensesService
        .getKpis(accessToken, userId, { vehicle_id: undefined })
        .then((kpis) => kpis.total_this_month),
      this.countUrgentMaintenances(client, userId, tz),
      this.getFleetCostPerKm(client, userId),
      this.getNextMaintenance(client, userId, activeVehicleId),
    ]);

    return {
      total_this_month: toKpiResult(totalThisMonth),
      urgent_maintenance_count: toKpiResult(urgentCount),
      cost_per_km: toKpiResult(costPerKm),
      next_maintenance: toKpiResult(nextMaintenance),
    };
  }

  /**
   * @spec SPEC-20260721-002 RF-01 (revisão: catálogo de KPIs configurável)
   * Sempre computa o catálogo completo (R-KPI-01) — qual KPI é exibido é decisão do frontend,
   * a partir de `user_preferences.dashboard_kpi_ids`; o backend não filtra por id para manter a
   * mesma simplicidade de composição de `getFleetKpis` (uma chamada, `Promise.allSettled`, falha
   * isolada por métrica — CA-S1-05.1).
   */
  async getFleetKpiCatalog(
    accessToken: string,
    userId: string,
    activeVehicleId: string | undefined,
  ): Promise<FleetKpiCatalog> {
    const client = this.clientForUser(accessToken);
    const tz = await this.resolveUserTimezone(accessToken, userId);

    const [
      expensesMonth,
      costPerKm,
      fleetHealth,
      urgentMaintenance,
      totalVehicles,
      nextMaintenance,
      upcomingCosts7d,
      expenseAnomalies,
    ] = await Promise.allSettled([
      this.getExpensesMonthSeries(client, userId),
      this.getCostPerKmSeries(client, userId),
      this.getFleetHealthAverage(client, userId),
      this.countUrgentMaintenances(client, userId, tz),
      this.countActiveVehicles(client, userId),
      this.getNextMaintenance(client, userId, activeVehicleId),
      this.getUpcomingCostsSummary(accessToken),
      this.countMonthlyAnomalies(client, tz),
    ]);

    return {
      expenses_month: toKpiResult(expensesMonth),
      cost_per_km: toKpiResult(costPerKm),
      fleet_health: toKpiResult(fleetHealth),
      urgent_maintenance: toKpiResult(urgentMaintenance),
      total_vehicles: toKpiResult(totalVehicles),
      next_maintenance: toKpiResult(nextMaintenance),
      upcoming_costs_7d: toKpiResult(upcomingCosts7d),
      expense_anomalies: toKpiResult(expenseAnomalies),
    };
  }

  /**
   * @spec SPEC-20260721-002 R-KPI-02
   * `null` (sem seta de tendência) quando a amostra do mês anterior é pequena demais para um
   * percentual ser informativo, ou quando o mês anterior é zero (divisão por zero).
   */
  private deltaPct(current: number, previous: number, previousSampleCount: number): number | null {
    if (previousSampleCount < DELTA_SUPPRESSION_MIN_SAMPLE || previous === 0) return null;
    return round2(((current - previous) / previous) * 100);
  }

  /** @spec SPEC-20260721-002 RF-01 — série de 6 meses agregada em uma única query (sem RPC dedicada) */
  private async getExpensesMonthSeries(client: SupabaseClient, userId: string): Promise<KpiSeriesValue> {
    const months = recentMonthStarts(KPI_SERIES_MONTHS);
    const rangeStart = toDateString(months[0]!);
    const rangeEnd = lastDayOfMonth(monthKey(months[months.length - 1]!));

    const { data, error } = await client
      .from("expenses")
      .select("occurred_at, amount")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("occurred_at", rangeStart)
      .lt("occurred_at", exclusiveDayUpperBoundUtc(rangeEnd));

    if (error) {
      throw new Error(error.message);
    }

    const buckets = new Map<string, { sum: number; count: number }>();
    for (const month of months) buckets.set(monthKey(month), { sum: 0, count: 0 });

    for (const row of (data ?? []) as { occurred_at: string; amount: number }[]) {
      const bucket = buckets.get(row.occurred_at.slice(0, 7));
      if (!bucket) continue;
      bucket.sum += row.amount;
      bucket.count += 1;
    }

    const history = months.map((month) => round2(buckets.get(monthKey(month))!.sum));
    const current = history[history.length - 1]!;
    // KPI_SERIES_MONTHS é 6 (constante) — o índice anterior sempre existe, sem fallback necessário.
    const previous = history[history.length - 2]!;
    const previousCount = buckets.get(monthKey(months[months.length - 2]!))!.count;

    return { value: current, delta_pct: this.deltaPct(current, previous, previousCount), history_6mo: history };
  }

  /**
   * @spec SPEC-20260721-002 RF-01
   * Reaproveita `get_vehicle_cost_per_km` (já suporta `p_month_start`) por veículo/mês — mesma
   * RPC de `getFleetCostPerKm`, generalizada para os últimos 6 meses.
   */
  private async getCostPerKmSeries(client: SupabaseClient, userId: string): Promise<KpiSeriesValue> {
    const { data: vehiclesData, error: vehiclesError } = await client
      .from("vehicles")
      .select("id")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (vehiclesError) {
      throw new Error(vehiclesError.message);
    }

    const vehicleIds = ((vehiclesData ?? []) as { id: string }[]).map((vehicle) => vehicle.id);
    const months = recentMonthStarts(KPI_SERIES_MONTHS);

    const monthlyTotals = await Promise.all(
      months.map(async (month) => {
        if (vehicleIds.length === 0) return { spent: 0, km: 0, count: 0 };

        const results = await Promise.all(
          vehicleIds.map((id) =>
            client.rpc("get_vehicle_cost_per_km", { p_vehicle_id: id, p_month_start: toDateString(month) }),
          ),
        );

        let spent = 0;
        let km = 0;
        let count = 0;
        for (const result of results) {
          if (result.error) {
            throw new Error(result.error.message);
          }
          const row = ((result.data ?? []) as { total_spent: number | null; total_km: number | null }[])[0];
          if (!row) continue;
          spent += row.total_spent ?? 0;
          km += row.total_km ?? 0;
          if ((row.total_spent ?? 0) > 0) count += 1;
        }
        return { spent, km, count };
      }),
    );

    const history = monthlyTotals.map((month) => (month.km > 0 ? round2(month.spent / month.km) : 0));
    const current = history[history.length - 1]!;
    // KPI_SERIES_MONTHS é 6 (constante) — o índice anterior sempre existe, sem fallback necessário.
    const previousIndex = history.length - 2;
    // eslint-disable-next-line security/detect-object-injection -- previousIndex é derivado de history.length (constante KPI_SERIES_MONTHS), não de input externo
    const previous = history[previousIndex]!;
    // eslint-disable-next-line security/detect-object-injection -- mesmo índice numérico interno acima
    const previousCount = monthlyTotals[previousIndex]!.count;

    return { value: current, delta_pct: this.deltaPct(current, previous, previousCount), history_6mo: history };
  }

  /** @spec SPEC-20260721-002 RF-01 — média simples dos scores por veículo, sem recálculo de peso */
  private async getFleetHealthAverage(client: SupabaseClient, userId: string): Promise<number | null> {
    const { data, error } = await client.rpc("calculate_fleet_health", { p_user_id: userId });
    if (error) {
      throw new Error(error.message);
    }
    const rows = (data ?? []) as { score: number }[];
    if (rows.length === 0) return null;
    return Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length);
  }

  private async countActiveVehicles(client: SupabaseClient, userId: string): Promise<number> {
    const { count, error } = await client
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) {
      throw new Error(error.message);
    }
    return count ?? 0;
  }

  /** @spec SPEC-20260721-002 RF-01 — reaproveita a RPC get_upcoming_costs (já existente, resolve o gap de RF-09) */
  private async getUpcomingCostsSummary(accessToken: string): Promise<{ total: number; count: number }> {
    const items = await this.expensesService.getUpcomingCosts(accessToken, {
      vehicle_id: undefined,
      horizon_days: UPCOMING_COSTS_KPI_HORIZON_DAYS,
    });
    return {
      total: round2(items.reduce((sum, item) => sum + (item.amount ?? 0), 0)),
      count: items.length,
    };
  }

  /**
   * @spec SPEC-20260721-002 RF-01 — conta anomalias (z-score) do mês corrente; RLS já isola por auth.uid() (R-ANA-05)
   * @spec SPEC-20260715-002 R-TZ-01 — "mês corrente" no fuso do usuário
   */
  private async countMonthlyAnomalies(client: SupabaseClient, tz: string): Promise<number> {
    const { data, error } = await client.rpc("detect_expense_anomalies", {
      p_threshold: ANOMALY_Z_SCORE_THRESHOLD,
    });
    if (error) {
      throw new Error(error.message);
    }
    const startOfMonth = toCalendarDay(new Date(), tz).slice(0, 7) + "-01";
    return ((data ?? []) as { date: string }[]).filter((row) => row.date >= startOfMonth).length;
  }

  /** @spec SPEC-20260715-002 RF-BK-03, R-TZ-01 — horizonte de urgência calculado no fuso do usuário */
  private async countUrgentMaintenances(client: SupabaseClient, userId: string, tz: string): Promise<number> {
    const horizon = addDays(new Date(), ALERT_HORIZON_DAYS);

    const { count, error } = await client
      .from("maintenances")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in("status", ["scheduled", "in_progress"])
      .lt("scheduled_date", exclusiveDayUpperBoundUtc(toCalendarDay(horizon, tz)));

    if (error) {
      throw new Error(error.message);
    }
    return count ?? 0;
  }

  private async getFleetCostPerKm(client: SupabaseClient, userId: string): Promise<number | null> {
    const { data: vehicles, error: vehiclesError } = await client
      .from("vehicles")
      .select("id")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (vehiclesError) {
      throw new Error(vehiclesError.message);
    }

    const vehicleIds = ((vehicles ?? []) as { id: string }[]).map((vehicle) => vehicle.id);
    if (vehicleIds.length === 0) {
      return null;
    }

    const results = await Promise.all(
      vehicleIds.map((id) => client.rpc("get_vehicle_cost_per_km", { p_vehicle_id: id })),
    );

    let totalSpent = 0;
    let totalKm = 0;
    for (const result of results) {
      if (result.error) {
        throw new Error(result.error.message);
      }
      const row = ((result.data ?? []) as { total_spent: number | null; total_km: number | null }[])[0];
      if (!row) continue;
      totalSpent += row.total_spent ?? 0;
      totalKm += row.total_km ?? 0;
    }

    return totalKm > 0 ? round2(totalSpent / totalKm) : null;
  }

  private async getNextMaintenance(
    client: SupabaseClient,
    userId: string,
    vehicleId: string | undefined,
  ): Promise<{ date: string; vehicle_plate: string } | null> {
    let builder = client
      .from("maintenances")
      .select("id, vehicle_id, description, scheduled_date, vehicles(plate)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in("status", ["scheduled", "in_progress"]);

    if (vehicleId) {
      builder = builder.eq("vehicle_id", vehicleId);
    }

    const { data, error } = await builder.order("scheduled_date", { ascending: true }).limit(1);
    if (error) {
      throw new Error(error.message);
    }

    const row = ((data ?? []) as MaintenanceAlertRow[])[0];
    return row ? { date: row.scheduled_date, vehicle_plate: resolvePlate(row) } : null;
  }

  /**
   * @spec SPEC-20260531-001 RF-DA-04
   * Reconciliação com `vehicle_recurring_costs` (RF-DB-06) é escopo da Sprint 3 — aqui o status
   * do documento é derivado apenas das datas em `vehicles.*`.
   */
  async getVehicleCards(accessToken: string, userId: string): Promise<VehicleCard[]> {
    const client = this.clientForUser(accessToken);
    const tz = await this.resolveUserTimezone(accessToken, userId);

    const { data, error } = await client
      .from("vehicles")
      .select(
        "id, plate, make, model, nickname, odometer, ipva_due_date, insurance_expires_at, crlv_expires_at",
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("plate", { ascending: true });

    if (error) {
      throw new NotFoundException("Não foi possível carregar os veículos da frota");
    }

    const today = new Date();
    const rows = (data ?? []) as VehicleCardRow[];

    return Promise.all(
      rows.map(async (vehicle) => {
        const lastFuel = await this.getLastFuelExpense(client, userId, vehicle.id);
        return {
          id: vehicle.id,
          plate: vehicle.plate,
          make: vehicle.make,
          model: vehicle.model,
          nickname: vehicle.nickname,
          odometer: vehicle.odometer,
          last_fuel_date: lastFuel?.occurred_at ?? null,
          last_fuel_amount: lastFuel?.amount ?? null,
          last_fuel_odometer_missing: lastFuel != null && lastFuel.odometer_km == null,
          documents: {
            ipva: classifyDocument(vehicle.ipva_due_date, today, tz),
            insurance: classifyDocument(vehicle.insurance_expires_at, today, tz),
            crlv: classifyDocument(vehicle.crlv_expires_at, today, tz),
          } satisfies VehicleDocumentsStatus,
        } satisfies VehicleCard;
      }),
    );
  }

  /**
   * @spec SPEC-20260531-001 RF-DB-07
   * Combina as últimas 20 despesas + manutenções do veículo, ordenadas por data decrescente —
   * reaproveita ExpensesService/MaintenancesService.findAll (sem query própria) para não duplicar
   * a lógica de isolamento por usuário/veículo já validada nesses módulos.
   */
  async getVehicleHistory(
    accessToken: string,
    userId: string,
    vehicleId: string,
  ): Promise<VehicleHistoryItem[]> {
    const [expenses, maintenances] = await Promise.all([
      this.expensesService.findAll(accessToken, userId, {
        page: 1,
        limit: HISTORY_LIMIT,
        vehicle_id: vehicleId,
        category: undefined,
        date_from: undefined,
        date_to: undefined,
      }),
      this.maintenancesService.findAll(accessToken, userId, {
        page: 1,
        limit: HISTORY_LIMIT,
        vehicle_id: vehicleId,
        status: undefined,
      }),
    ]);

    const expenseItems: VehicleHistoryItem[] = expenses.data.map((expense) => ({
      id: expense.id,
      type: "expense",
      date: expense.occurred_at,
      description: expense.description ?? expense.category,
      amount: expense.amount,
    }));

    const maintenanceItems: VehicleHistoryItem[] = maintenances.data.map((maintenance) => ({
      id: maintenance.id,
      type: "maintenance",
      date: maintenance.completion_date ?? maintenance.scheduled_date,
      description: maintenance.description,
      amount: maintenance.cost,
    }));

    return [...expenseItems, ...maintenanceItems]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, HISTORY_LIMIT);
  }

  /**
   * @spec SPEC-20260531-001 CA-S3-03
   * `odometer_km` só pode ser null em registros anteriores à obrigatoriedade de RF-BD-04
   * (validação Zod do frontend) — dado legado, não um caminho normal de criação hoje.
   */
  private async getLastFuelExpense(
    client: SupabaseClient,
    userId: string,
    vehicleId: string,
  ): Promise<{ occurred_at: string; amount: number; odometer_km: number | null } | null> {
    const { data, error } = await client
      .from("expenses")
      .select("occurred_at, amount, odometer_km")
      .eq("user_id", userId)
      .eq("vehicle_id", vehicleId)
      .eq("category", "fuel")
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }
    return (
      ((data ?? []) as { occurred_at: string; amount: number; odometer_km: number | null }[])[0] ?? null
    );
  }

  /**
   * @spec SPEC-20260722-004 RF-01, P7, RNF-01, RNF-04
   * `GROUP BY + SUM + LIMIT 3` roda inteiramente na RPC (P7) — o service só mapeia label e
   * repassa. Ownership de `vehicleId`/`groupIds` é garantida pela combinação
   * `auth.uid()`/RLS dentro da função (RNF-04): id de outro usuário simplesmente não casa com
   * nenhuma linha de `expenses`, sem 403 que revele a existência do recurso alheio.
   */
  async getSpendingHighlights(
    accessToken: string,
    vehicleId: string | undefined,
    groupIds: string[] | undefined,
  ): Promise<CategorySummaryItem[]> {
    const { data, error } = await this.clientForUser(accessToken).rpc(
      "get_category_spending_highlights",
      {
        p_vehicle_id: vehicleId ?? null,
        p_group_vehicle_ids: groupIds && groupIds.length > 0 ? groupIds : null,
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as CategorySpendingRpcRow[]).map((row) => ({
      category: row.category,
      label: categoryLabel(row.category),
      total_amount: round2(row.total_amount),
      count: row.expense_count,
    }));
  }

  /**
   * @spec SPEC-20260722-004 RF-02, R-SUB-03, R-SUB-04, RNF-02
   * Única passagem na RPC (`COUNT` + `MIN(due_date) FILTER (WHERE status = 'pending')`) —
   * a classificação overdue/open só compara datas aqui, sem query adicional.
   */
  async getFinesStatus(accessToken: string, userId: string): Promise<FinesStatusResponse> {
    const { data, error } = await this.clientForUser(accessToken).rpc("get_fines_status_summary");

    if (error) {
      throw new Error(error.message);
    }

    const row = ((data ?? []) as FinesStatusRpcRow[])[0];
    const count = row?.active_count ?? 0;

    if (count === 0) {
      return { status: "none", count: 0 };
    }

    const tz = await this.resolveUserTimezone(accessToken, userId);

    const today = toCalendarDay(new Date(), tz);
    const isOverdue = row?.earliest_pending_due_date != null && row.earliest_pending_due_date < today;

    return { status: isOverdue ? "overdue" : "open", count };
  }
}
