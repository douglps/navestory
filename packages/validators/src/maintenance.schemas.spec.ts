import { describe, expect, it } from "vitest";
import {
  MAINTENANCE_STATUS_TRANSITIONS,
  createMaintenanceInputSchema,
  listMaintenancesQuerySchema,
  updateMaintenanceInputSchema,
} from "./maintenance.schemas";

const validUuid = "11111111-1111-4111-8111-111111111111";

describe("createMaintenanceInputSchema", () => {
  const base = {
    vehicle_id: validUuid,
    description: "Troca de óleo",
    scheduled_date: "2026-08-01",
  };

  it("aceita payload mínimo válido (RF-01)", () => {
    expect(createMaintenanceInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita description abaixo de 3 caracteres", () => {
    expect(createMaintenanceInputSchema.safeParse({ ...base, description: "ab" }).success).toBe(false);
  });

  it("rejeita scheduled_date fora do formato YYYY-MM-DD ou ISO 8601 (R-TZ-03)", () => {
    // "14/08/2026" não é YYYY-MM-DD nem parseável como ISO 8601 (mês 14 é inválido) — diferente
    // de "01/08/2026", que Date.parse aceitaria ambiguamente como MM/DD/YYYY.
    expect(
      createMaintenanceInputSchema.safeParse({ ...base, scheduled_date: "14/08/2026" }).success,
    ).toBe(false);
  });

  it("não possui campo status (RF-03 — sempre scheduled na criação)", () => {
    const parsed = createMaintenanceInputSchema.safeParse({ ...base, status: "completed" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).status).toBeUndefined();
    }
  });

  it("aceita campos opcionais", () => {
    const result = createMaintenanceInputSchema.safeParse({
      ...base,
      cost: 350.5,
      odometer_km: 50000,
      completion_date: "2026-08-02",
      metadata: { workshop: "Oficina do João" },
    });
    expect(result.success).toBe(true);
  });

  it("rejeita odometer_km acima de 9.999.999 (R-ODO-02)", () => {
    expect(
      createMaintenanceInputSchema.safeParse({ ...base, odometer_km: 10_000_000 }).success,
    ).toBe(false);
  });
});

describe("updateMaintenanceInputSchema", () => {
  it("aceita atualização parcial de status", () => {
    expect(updateMaintenanceInputSchema.safeParse({ status: "in_progress" }).success).toBe(true);
  });

  it("aceita objeto vazio", () => {
    expect(updateMaintenanceInputSchema.safeParse({}).success).toBe(true);
  });

  it("não permite alterar vehicle_id", () => {
    const parsed = updateMaintenanceInputSchema.safeParse({ vehicle_id: validUuid });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).vehicle_id).toBeUndefined();
    }
  });

  it("rejeita status inválido", () => {
    expect(updateMaintenanceInputSchema.safeParse({ status: "scheduled_wrong" }).success).toBe(
      false,
    );
  });
});

describe("listMaintenancesQuerySchema", () => {
  it("aplica defaults de paginação", () => {
    const parsed = listMaintenancesQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.limit).toBe(20);
    }
  });

  it("rejeita limit acima de 100 (P1)", () => {
    expect(listMaintenancesQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  });
});

describe("MAINTENANCE_STATUS_TRANSITIONS", () => {
  it("define o grafo de transições da R7 com scheduled como estado inicial", () => {
    expect(MAINTENANCE_STATUS_TRANSITIONS.scheduled).toEqual([
      "in_progress",
      "completed",
      "cancelled",
    ]);
    expect(MAINTENANCE_STATUS_TRANSITIONS.in_progress).toEqual(["completed", "cancelled"]);
    expect(MAINTENANCE_STATUS_TRANSITIONS.completed).toEqual([]);
    expect(MAINTENANCE_STATUS_TRANSITIONS.cancelled).toEqual([]);
  });
});
