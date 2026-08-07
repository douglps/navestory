import { describe, expect, it } from "vitest";
import {
  cnhStatusSchema,
  complianceEntrySchema,
  complianceQuerySchema,
  driverSettingsSchema,
  memberProfileSchema,
  registrationStatusSchema,
  updateDriverSettingsInputSchema,
  updateMemberProfileInputSchema,
} from "./fleet-settings.schemas";

const UUID = "00000000-0000-0000-0000-000000000000";

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-01, RF-02, R-FLEET-01
 */
describe("driverSettingsSchema", () => {
  it("aceita payload completo", () => {
    const result = driverSettingsSchema.safeParse({
      workspace_id: UUID,
      require_cnh_number: true,
      require_cnh_expiry: true,
      require_cnh_category: false,
      require_phone: false,
      updated_at: "2026-08-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita workspace_id que não é uuid", () => {
    const result = driverSettingsSchema.safeParse({
      workspace_id: "não-é-uuid",
      require_cnh_number: true,
      require_cnh_expiry: true,
      require_cnh_category: false,
      require_phone: false,
      updated_at: "2026-08-01T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-02
 */
describe("updateDriverSettingsInputSchema", () => {
  it("aceita atualização parcial de um único campo", () => {
    expect(
      updateDriverSettingsInputSchema.safeParse({ requireCnhNumber: true }).success,
    ).toBe(true);
  });

  it("aceita objeto vazio (todos os campos são opcionais)", () => {
    expect(updateDriverSettingsInputSchema.safeParse({}).success).toBe(true);
  });

  it("rejeita valor não-booleano", () => {
    expect(
      updateDriverSettingsInputSchema.safeParse({ requireCnhNumber: "sim" }).success,
    ).toBe(false);
  });
});

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-04
 */
describe("updateMemberProfileInputSchema", () => {
  it("aceita campos preenchidos", () => {
    const result = updateMemberProfileInputSchema.safeParse({
      cnhNumber: "12345678900",
      cnhCategory: "B",
      cnhExpiresAt: "2030-01-01",
      phone: "11999999999",
    });
    expect(result.success).toBe(true);
  });

  it("aceita campos nulos (limpar valor)", () => {
    const result = updateMemberProfileInputSchema.safeParse({
      cnhNumber: null,
      cnhCategory: null,
      cnhExpiresAt: null,
      phone: null,
    });
    expect(result.success).toBe(true);
  });

  it("aceita objeto vazio (atualização parcial)", () => {
    expect(updateMemberProfileInputSchema.safeParse({}).success).toBe(true);
  });

  it("rejeita cnhExpiresAt fora do formato de data", () => {
    const result = updateMemberProfileInputSchema.safeParse({ cnhExpiresAt: "não-é-data" });
    expect(result.success).toBe(false);
  });

  it("rejeita cnhNumber com mais de 20 caracteres", () => {
    const result = updateMemberProfileInputSchema.safeParse({ cnhNumber: "1".repeat(21) });
    expect(result.success).toBe(false);
  });
});

describe("memberProfileSchema", () => {
  it("aceita perfil com todos os campos nulos", () => {
    const result = memberProfileSchema.safeParse({
      workspace_member_id: UUID,
      cnh_number: null,
      cnh_category: null,
      cnh_expires_at: null,
      phone: null,
      updated_at: "2026-08-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-08, RF-09, RF-10, R-DS-08
 */
describe("cnhStatusSchema", () => {
  it("aceita todos os valores válidos", () => {
    for (const status of ["ok", "warning", "urgency_hot", "expired", "not_set"]) {
      expect(cnhStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejeita valor fora do enum", () => {
    expect(cnhStatusSchema.safeParse("vencido").success).toBe(false);
  });
});

describe("registrationStatusSchema", () => {
  it("aceita 'complete' e 'incomplete'", () => {
    expect(registrationStatusSchema.safeParse("complete").success).toBe(true);
    expect(registrationStatusSchema.safeParse("incomplete").success).toBe(true);
  });

  it("rejeita valor fora do enum", () => {
    expect(registrationStatusSchema.safeParse("pendente").success).toBe(false);
  });
});

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-11
 */
describe("complianceEntrySchema", () => {
  it("aceita entrada completa, com campos nulos permitidos", () => {
    const result = complianceEntrySchema.safeParse({
      memberId: UUID,
      name: null,
      email: null,
      registrationStatus: "incomplete",
      missingFields: ["cnhNumber", "phone"],
      cnhStatus: "not_set",
      cnhExpiresAt: null,
      cnhDaysRemaining: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita cnhDaysRemaining não-inteiro", () => {
    const result = complianceEntrySchema.safeParse({
      memberId: UUID,
      name: "Motorista",
      email: "motorista@exemplo.com",
      registrationStatus: "complete",
      missingFields: [],
      cnhStatus: "ok",
      cnhExpiresAt: "2030-01-01",
      cnhDaysRemaining: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-12
 */
describe("complianceQuerySchema", () => {
  it("aceita query vazia (ambos os filtros são opcionais)", () => {
    expect(complianceQuerySchema.safeParse({}).success).toBe(true);
  });

  it("aceita filtros combinados válidos", () => {
    const result = complianceQuerySchema.safeParse({
      registrationStatus: "incomplete",
      cnhStatus: "expired",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita registrationStatus fora do enum", () => {
    expect(
      complianceQuerySchema.safeParse({ registrationStatus: "pendente" }).success,
    ).toBe(false);
  });
});
