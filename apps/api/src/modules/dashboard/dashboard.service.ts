import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  DocumentStatus,
  FleetAlert,
  FleetHealthEntry,
  FleetKpis,
  KpiResult,
  VehicleCard,
  VehicleDocumentsStatus,
  VehicleHistoryItem,
} from "@nave/validators";
import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeCsvField } from "../../shared/csv/csv.util";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";
import { ExpensesService } from "../expenses/expenses.service";
import { MaintenancesService } from "../maintenances/maintenances.service";

const HISTORY_LIMIT = 20;

const ALERT_HORIZON_DAYS = 7;
const DOCUMENT_ATTENTION_DAYS = 30;

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

/**
 * Ambas as pontas devem usar a mesma convenção de "dia calendário" (UTC, via `toDateString`) —
 * misturar com `getFullYear`/`getMonth`/`getDate` (calendário local) gera off-by-one perto da
 * meia-noite UTC dependendo do fuso do processo.
 */
function daysUntil(dateStr: string, today: Date): number {
  const due = Date.parse(`${dateStr}T00:00:00Z`);
  const todayMidnightUtc = Date.parse(`${toDateString(today)}T00:00:00Z`);
  return Math.round((due - todayMidnightUtc) / 86_400_000);
}

function toKpiResult<T>(settled: PromiseSettledResult<T>): KpiResult<T> {
  return settled.status === "fulfilled" ? { ok: true, value: settled.value } : { ok: false };
}

function classifyDocument(dateStr: string | null, today: Date): DocumentStatus {
  if (!dateStr) return "unknown";
  const days = daysUntil(dateStr, today);
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

const CSV_MAX_ROWS = 5_000;
const CSV_HEADER = "Data,Placa,Modelo,Categoria,Descricao,Valor";

interface ExpenseExportRow {
  date: string;
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
  ) {}

  private clientForUser(accessToken: string): SupabaseClient {
    return createUserScopedClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      accessToken,
    );
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
      .select("date, amount, category, description, vehicles(plate, model)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("date", `${period}-01`)
      .lte("date", lastDayOfMonth(period));

    if (vehicleId) {
      builder = builder.eq("vehicle_id", vehicleId);
    }

    const { data, error } = await builder.order("date", { ascending: false }).limit(CSV_MAX_ROWS);

    if (error) {
      return `${CSV_HEADER}\n`;
    }

    const rows = ((data ?? []) as ExpenseExportRow[]).map((row) => {
      const vehicle = resolveVehicle(row);
      return [
        row.date,
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
    const today = new Date();
    const horizon = addDays(today, ALERT_HORIZON_DAYS);

    const [maintenanceResult, documentAlerts] = await Promise.all([
      client
        .from("maintenances")
        .select("id, vehicle_id, description, scheduled_date, vehicles(plate)")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .in("status", ["scheduled", "in_progress"])
        .lte("scheduled_date", toDateString(horizon))
        .order("scheduled_date", { ascending: true }),
      this.getDocumentOverdueAlerts(client, userId, today),
    ]);

    if (maintenanceResult.error) {
      throw new NotFoundException("Não foi possível carregar os alertas da frota");
    }

    const maintenanceAlerts = ((maintenanceResult.data ?? []) as MaintenanceAlertRow[]).map((row) => {
      const daysUntilDue = daysUntil(row.scheduled_date, today);
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

        const daysUntilDue = daysUntil(dueDate, today);
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

    const [totalThisMonth, urgentCount, costPerKm, nextMaintenance] = await Promise.allSettled([
      this.expensesService
        .getKpis(accessToken, userId, { vehicle_id: undefined })
        .then((kpis) => kpis.total_this_month),
      this.countUrgentMaintenances(client, userId),
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

  private async countUrgentMaintenances(client: SupabaseClient, userId: string): Promise<number> {
    const horizon = addDays(new Date(), ALERT_HORIZON_DAYS);

    const { count, error } = await client
      .from("maintenances")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in("status", ["scheduled", "in_progress"])
      .lte("scheduled_date", toDateString(horizon));

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
          last_fuel_date: lastFuel?.date ?? null,
          last_fuel_amount: lastFuel?.amount ?? null,
          last_fuel_odometer_missing: lastFuel != null && lastFuel.odometer_km == null,
          documents: {
            ipva: classifyDocument(vehicle.ipva_due_date, today),
            insurance: classifyDocument(vehicle.insurance_expires_at, today),
            crlv: classifyDocument(vehicle.crlv_expires_at, today),
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
      date: expense.date,
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
  ): Promise<{ date: string; amount: number; odometer_km: number | null } | null> {
    const { data, error } = await client
      .from("expenses")
      .select("date, amount, odometer_km")
      .eq("user_id", userId)
      .eq("vehicle_id", vehicleId)
      .eq("category", "fuel")
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }
    return ((data ?? []) as { date: string; amount: number; odometer_km: number | null }[])[0] ?? null;
  }
}
