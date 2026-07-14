import { describe, expect, it } from "vitest";
import {
  createGroupInputSchema,
  setGroupMembersInputSchema,
  updateGroupInputSchema,
} from "./vehicle-group.schemas";

describe("createGroupInputSchema", () => {
  it("aceita nome e cor válidos (CA-01)", () => {
    const result = createGroupInputSchema.safeParse({ name: "Motos", color: "#ef4444" });
    expect(result.success).toBe(true);
  });

  it("rejeita nome vazio (CA-02)", () => {
    const result = createGroupInputSchema.safeParse({ name: "", color: "#ef4444" });
    expect(result.success).toBe(false);
    expect(result.success ? null : result.error.issues[0]?.message).toBe("Nome obrigatório");
  });

  it("rejeita cor fora do formato hex de 6 dígitos (CA-03)", () => {
    const result = createGroupInputSchema.safeParse({ name: "X", color: "red" });
    expect(result.success).toBe(false);
    expect(result.success ? null : result.error.issues[0]?.message).toBe(
      "Cor inválida — use hex de 6 dígitos",
    );
  });

  it("rejeita nome com mais de 60 caracteres", () => {
    const result = createGroupInputSchema.safeParse({
      name: "a".repeat(61),
      color: "#ef4444",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateGroupInputSchema", () => {
  it("aceita atualização parcial de apenas nome ou cor", () => {
    expect(updateGroupInputSchema.safeParse({ name: "Frota SP" }).success).toBe(true);
    expect(updateGroupInputSchema.safeParse({ color: "#22c55e" }).success).toBe(true);
    expect(updateGroupInputSchema.safeParse({}).success).toBe(true);
  });
});

describe("setGroupMembersInputSchema", () => {
  it("aceita lista de até 200 uuids", () => {
    const result = setGroupMembersInputSchema.safeParse({ vehicleIds: [] });
    expect(result.success).toBe(true);
  });

  it("rejeita mais de 200 vehicleIds (CA-04, R-GRP-01)", () => {
    const vehicleIds = Array.from({ length: 201 }, () => "00000000-0000-0000-0000-000000000000");
    const result = setGroupMembersInputSchema.safeParse({ vehicleIds });
    expect(result.success).toBe(false);
  });

  it("rejeita uuid inválido na lista", () => {
    const result = setGroupMembersInputSchema.safeParse({ vehicleIds: ["not-a-uuid"] });
    expect(result.success).toBe(false);
  });
});
