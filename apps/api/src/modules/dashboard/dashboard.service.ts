import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";

const CSV_MAX_ROWS = 5_000;
const CSV_HEADER = "Data,Placa,Modelo,Categoria,Descricao,Valor";

interface ExpenseExportRow {
  date: string;
  amount: number;
  category: string;
  description: string | null;
  vehicles: { plate: string; model: string | null } | { plate: string; model: string | null }[] | null;
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
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
}
