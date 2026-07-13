import { describe, expect, it } from "vitest";
import { decodeJwtExp } from "./decode-jwt-exp";

function buildUnsignedJwt(payload: Record<string, unknown>): string {
  const base64url = (input: string) =>
    Buffer.from(input).toString("base64url");
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.dummy-signature`;
}

describe("decodeJwtExp", () => {
  it("retorna o exp (em ms) de um JWT válido", () => {
    const expSeconds = Math.floor(Date.now() / 1000) + 3600;
    const token = buildUnsignedJwt({ sub: "user-1", exp: expSeconds });

    expect(decodeJwtExp(token)).toBe(expSeconds * 1000);
  });

  it("retorna null quando o payload não tem exp", () => {
    const token = buildUnsignedJwt({ sub: "user-1" });

    expect(decodeJwtExp(token)).toBeNull();
  });

  it("retorna null para um token malformado", () => {
    expect(decodeJwtExp("token-invalido")).toBeNull();
  });

  it("retorna null para uma string vazia", () => {
    expect(decodeJwtExp("")).toBeNull();
  });
});
