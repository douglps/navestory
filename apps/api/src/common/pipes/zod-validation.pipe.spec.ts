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

  it("ignora a validação quando metadata.data está preenchido (extração de chave específica, ex: @Param(\"id\"))", () => {
    const pipe = new ZodValidationPipe(schema);
    const value = "some-id";

    expect(pipe.transform(value, { type: "param", data: "id" })).toBe(value);
  });

  it("ignora a validação quando metadata.type não é body nem query (ex: @UserId())", () => {
    const pipe = new ZodValidationPipe(schema);
    const value = "u1";

    expect(pipe.transform(value, { type: "custom" })).toBe(value);
  });

  it("valida normalmente quando metadata.type é query sem data (objeto inteiro)", () => {
    const pipe = new ZodValidationPipe(schema);

    expect(() => pipe.transform({ email: "inválido" }, { type: "query" })).toThrow(
      BadRequestException,
    );
  });
});
