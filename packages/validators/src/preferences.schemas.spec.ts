import { describe, expect, it } from "vitest";
import { DEFAULT_AUTO_DRAFT_ENABLED, updatePreferencesInputSchema } from "./preferences.schemas";

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
});
