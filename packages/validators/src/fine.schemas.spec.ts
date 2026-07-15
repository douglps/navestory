import { describe, expect, it } from "vitest";
import {
  FINE_STATUS_TRANSITIONS,
  createFineInputSchema,
  updateFineInputSchema,
} from "./fine.schemas";

const validUuid = "11111111-1111-4111-8111-111111111111";

describe("createFineInputSchema", () => {
  const base = {
    vehicle_id: validUuid,
    description: "Excesso de velocidade",
    amount: 195.23,
    occurred_at: "2026-07-01",
  };

  it("aceita payload mínimo válido (RF-01)", () => {
    expect(createFineInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita description abaixo de 3 caracteres", () => {
    expect(createFineInputSchema.safeParse({ ...base, description: "ab" }).success).toBe(false);
  });

  it("rejeita amount zero ou negativo", () => {
    expect(createFineInputSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(createFineInputSchema.safeParse({ ...base, amount: -10 }).success).toBe(false);
  });

  it("rejeita occurred_at fora do formato YYYY-MM-DD", () => {
    expect(createFineInputSchema.safeParse({ ...base, occurred_at: "01/07/2026" }).success).toBe(
      false,
    );
  });

  it("não possui campo status (RF-05 — sempre pending na criação)", () => {
    const parsed = createFineInputSchema.safeParse({ ...base, status: "paid" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).status).toBeUndefined();
    }
  });

  it("aceita campos opcionais do auto de infração", () => {
    const result = createFineInputSchema.safeParse({
      ...base,
      auto_number: "AB123456",
      infraction_code: "55170",
      amount_with_discount: 150.0,
      due_date: "2026-07-30",
      appeal_deadline: "2026-07-15",
      location: "Av. Paulista, 1000",
      odometer_km: 45000,
      driver_name: "João Silva",
      notes: "Fotografado pelo radar",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateFineInputSchema", () => {
  it("aceita atualização parcial de status", () => {
    expect(updateFineInputSchema.safeParse({ status: "paid" }).success).toBe(true);
  });

  it("aceita objeto vazio", () => {
    expect(updateFineInputSchema.safeParse({}).success).toBe(true);
  });

  it("não permite alterar vehicle_id", () => {
    const parsed = updateFineInputSchema.safeParse({ vehicle_id: validUuid });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).vehicle_id).toBeUndefined();
    }
  });

  it("rejeita status inválido", () => {
    expect(updateFineInputSchema.safeParse({ status: "refunded" }).success).toBe(false);
  });
});

describe("FINE_STATUS_TRANSITIONS", () => {
  it("define o grafo de transições da RF-05", () => {
    expect(FINE_STATUS_TRANSITIONS.pending).toEqual(["paid", "appealing", "cancelled"]);
    expect(FINE_STATUS_TRANSITIONS.appealing).toEqual(["paid", "cancelled"]);
    expect(FINE_STATUS_TRANSITIONS.paid).toEqual([]);
    expect(FINE_STATUS_TRANSITIONS.cancelled).toEqual([]);
  });
});
