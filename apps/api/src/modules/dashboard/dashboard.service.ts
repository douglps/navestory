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
} from "@nave/validators";
import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeCsvField } from "../../shared/csv/csv.util";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";
import { ExpensesService } from "../expenses/expenses.service";

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
   * @spec SPEC-20260531-001 RF-DA-01, RF-DA-02
   * Escopo Sprint 1: apenas alertas de manutenção (vencida ou em até 7 dias). Alertas de
   * documentos (IPVA/Seguro/CRLV) entram na Sprint 3 (CA-S3-02), conforme migração incremental
   * (seção 12.3 da spec). Lista retornada já ordenada por urgência — o frontend recorta os 3
   * primeiros e monta o link "ver todos (+N)" com o restante.
   */
  async getAlerts(accessToken: string, userId: string): Promise<FleetAlert[]> {
    const client = this.clientForUser(accessToken);
    const today = new Date();
    const horizon = addDays(today, ALERT_HORIZON_DAYS);

    const { data, error } = await client
      .from("maintenances")
      .select("id, vehicle_id, description, scheduled_date, vehicles(plate)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in("status", ["scheduled", "in_progress"])
      .lte("scheduled_date", toDateString(horizon))
      .order("scheduled_date", { ascending: true });

    if (error) {
      throw new NotFoundException("Não foi possível carregar os alertas da frota");
    }

    return ((data ?? []) as MaintenanceAlertRow[]).map((row) => {
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
          documents: {
            ipva: classifyDocument(vehicle.ipva_due_date, today),
            insurance: classifyDocument(vehicle.insurance_expires_at, today),
            crlv: classifyDocument(vehicle.crlv_expires_at, today),
          } satisfies VehicleDocumentsStatus,
        } satisfies VehicleCard;
      }),
    );
  }

  private async getLastFuelExpense(
    client: SupabaseClient,
    userId: string,
    vehicleId: string,
  ): Promise<{ date: string; amount: number } | null> {
    const { data, error } = await client
      .from("expenses")
      .select("date, amount")
      .eq("user_id", userId)
      .eq("vehicle_id", vehicleId)
      .eq("category", "fuel")
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }
    return ((data ?? []) as { date: string; amount: number }[])[0] ?? null;
  }
}
