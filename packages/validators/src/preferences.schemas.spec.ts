import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUTO_DRAFT_ENABLED,
  DEFAULT_CHIP_FIELDS,
  chipFieldsSchema,
  updatePreferencesInputSchema,
} from "./preferences.schemas";

describe("DEFAULT_AUTO_DRAFT_ENABLED", () => {
  it("é false (R-PREF-02 — default sem rascunho)", () => {
    expect(DEFAULT_AUTO_DRAFT_ENABLED).toBe(false);
  });
});

describe("updatePreferencesInputSchema", () => {
  it("aceita auto_draft_enabled true", () => {
    const result = updatePreferencesInputSchema.safeParse({ auto_draft_enabled: true });
    expect(result.success).toBe(true);
  });

  it("aceita auto_draft_enabled false", () => {
    const result = updatePreferencesInputSchema.safeParse({ auto_draft_enabled: false });
    expect(result.success).toBe(true);
  });

  it("rejeita valor não booleano", () => {
    const result = updatePreferencesInputSchema.safeParse({ auto_draft_enabled: "true" });
    expect(result.success).toBe(false);
  });

  it("rejeita payload vazio", () => {
    const result = updatePreferencesInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("aceita apenas vehicle_chip_fields (RF-06 — atualização parcial)", () => {
    const result = updatePreferencesInputSchema.safeParse({ vehicle_chip_fields: ["plate"] });
    expect(result.success).toBe(true);
  });

  it("aceita apenas dashboard_kpi_ids (SPEC-20260721-002 RF-01 — atualização parcial)", () => {
    const result = updatePreferencesInputSchema.safeParse({ dashboard_kpi_ids: ["fleet_health"] });
    expect(result.success).toBe(true);
  });

  it("rejeita dashboard_kpi_ids com id fora do catálogo", () => {
    const result = updatePreferencesInputSchema.safeParse({ dashboard_kpi_ids: ["nao_existe"] });
    expect(result.success).toBe(false);
  });

  it("aceita apenas spending_window_days (SPEC-20260804-001 RF-02 — atualização parcial)", () => {
    for (const days of [7, 14, 30]) {
      expect(updatePreferencesInputSchema.safeParse({ spending_window_days: days }).success).toBe(true);
    }
  });

  it("rejeita spending_window_days fora do conjunto fechado {7, 14, 30} (SPEC-20260804-001 RF-02, US-02)", () => {
    const result = updatePreferencesInputSchema.safeParse({ spending_window_days: 10 });
    expect(result.success).toBe(false);
  });
});

describe("DEFAULT_CHIP_FIELDS", () => {
  it("é [make, plate, model] (RF-05 — ordem padrão atualizada em 2026-06-15)", () => {
    expect(DEFAULT_CHIP_FIELDS).toEqual(["make", "plate", "model"]);
  });
});

describe("chipFieldsSchema", () => {
  it("aceita apenas placa (RF-02)", () => {
    expect(chipFieldsSchema.safeParse(["plate"]).success).toBe(true);
  });

  it("aceita placa + 2 campos opcionais (RF-02)", () => {
    expect(chipFieldsSchema.safeParse(["make", "plate", "model"]).success).toBe(true);
  });

  it("rejeita configuração sem placa (RF-01, CT-01)", () => {
    const result = chipFieldsSchema.safeParse(["make", "model"]);
    expect(result.success).toBe(false);
  });

  it("rejeita mais de 3 campos (RF-02, CT-02)", () => {
    const result = chipFieldsSchema.safeParse(["plate", "make", "model", "nickname"]);
    expect(result.success).toBe(false);
  });

  it("rejeita array vazio (RF-02)", () => {
    expect(chipFieldsSchema.safeParse([]).success).toBe(false);
  });

  it("rejeita campo repetido (RF-03)", () => {
    const result = chipFieldsSchema.safeParse(["plate", "plate"]);
    expect(result.success).toBe(false);
  });

  it("rejeita campo desconhecido", () => {
    const result = chipFieldsSchema.safeParse(["plate", "color"]);
    expect(result.success).toBe(false);
  });

  it("preserva a ordem informada (RF-05, CT-07)", () => {
    const result = chipFieldsSchema.safeParse(["plate", "make"]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["plate", "make"]);
    }
  });
});
