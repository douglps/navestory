import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "./zod-validation.pipe";

describe("ZodValidationPipe", () => {
  const schema = z.object({ email: z.string().email() });

  it("retorna o valor parseado quando válido", () => {
    const pipe = new ZodValidationPipe(schema);
    expect(pipe.transform({ email: "a@b.com" })).toEqual({ email: "a@b.com" });
  });

  it("lança BadRequestException com mensagens quando inválido (400 = falha de schema Zod)", () => {
    const pipe = new ZodValidationPipe(schema);
    expect(() => pipe.transform({ email: "inválido" })).toThrow(BadRequestException);
  });
});
