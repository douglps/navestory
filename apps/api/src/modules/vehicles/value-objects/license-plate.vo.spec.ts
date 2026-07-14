import { BadRequestException } from "@nestjs/common";
import { LicensePlate } from "./license-plate.vo";

describe("LicensePlate", () => {
  it("normaliza placa BR com hífen para uppercase sem hífen (CA-01)", () => {
    expect(LicensePlate.create("abc-1234").toString()).toBe("ABC1234");
  });

  it("aceita placa padrão Mercosul (CA-03)", () => {
    expect(LicensePlate.create("ABC1D23").toString()).toBe("ABC1D23");
  });

  it("rejeita placa com formato inválido (menos de 7 caracteres)", () => {
    expect(() => LicensePlate.create("AB1234")).toThrow(BadRequestException);
  });

  it("rejeita placa com formato inválido (letras e números fora de ordem)", () => {
    expect(() => LicensePlate.create("123ABC4")).toThrow(BadRequestException);
  });
});
