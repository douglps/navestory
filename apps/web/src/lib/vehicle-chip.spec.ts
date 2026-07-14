import { describe, expect, it } from "vitest";
import { formatChipPreview, resolveChipValue } from "./vehicle-chip";

const vehicle = { make: "Toyota", model: "Corolla", plate: "ABC1D23", nickname: null };
const vehicleComApelido = { ...vehicle, nickname: "Branquinho" };

describe("resolveChipValue", () => {
  it("retorna o apelido quando presente", () => {
    expect(resolveChipValue("nickname", vehicleComApelido)).toBe("Branquinho");
  });

  it("faz fallback para model quando nickname ausente (RF-04, CT-03)", () => {
    expect(resolveChipValue("nickname", vehicle)).toBe("Corolla");
  });

  it("retorna vazio sem quebrar quando nickname e model ausentes (RF-04)", () => {
    expect(resolveChipValue("nickname", { ...vehicle, model: null })).toBe("");
  });

  it("retorna o valor direto para plate/make/model", () => {
    expect(resolveChipValue("plate", vehicle)).toBe("ABC1D23");
    expect(resolveChipValue("make", vehicle)).toBe("Toyota");
  });
});

describe("formatChipPreview", () => {
  it("monta a prévia na ordem configurada (RF-05, CT-07)", () => {
    expect(formatChipPreview(["plate", "make"], vehicle)).toBe("ABC1D23 Toyota");
  });

  it("exibe apenas a placa quando é o único campo (CT-06)", () => {
    expect(formatChipPreview(["plate"], vehicle)).toBe("ABC1D23");
  });

  it("usa fallback de apelido para model dentro da ordem (RF-04)", () => {
    expect(formatChipPreview(["nickname", "plate"], vehicle)).toBe("Corolla ABC1D23");
  });
});
