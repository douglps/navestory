import { describe, expect, it } from "vitest";
import { decodeJwtRole } from "./decode-jwt-role";

function buildUnsignedJwt(payload: Record<string, unknown>): string {
  const base64url = (input: string) =>
    Buffer.from(input).toString("base64url");
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.dummy-signature`;
}

describe("decodeJwtRole", () => {
  it("SPEC-20260731-008 RF-09: extrai role 'admin' de app_metadata", () => {
    const token = buildUnsignedJwt({ app_metadata: { role: "admin" } });
    expect(decodeJwtRole(token)).toBe("admin");
  });

  it("SPEC-20260731-008 RF-09: extrai role 'user' de app_metadata", () => {
    const token = buildUnsignedJwt({ app_metadata: { role: "user" } });
    expect(decodeJwtRole(token)).toBe("user");
  });

  it("retorna null quando app_metadata não existe no payload", () => {
    const token = buildUnsignedJwt({ sub: "user-123" });
    expect(decodeJwtRole(token)).toBeNull();
  });

  it("retorna null quando app_metadata existe mas não tem campo role", () => {
    const token = buildUnsignedJwt({ app_metadata: { other_field: "value" } });
    expect(decodeJwtRole(token)).toBeNull();
  });

  it("retorna null para token malformado", () => {
    expect(decodeJwtRole("token-invalido")).toBeNull();
  });

  it("retorna null para string vazia", () => {
    expect(decodeJwtRole("")).toBeNull();
  });

  it("retorna null para token com apenas dois segmentos", () => {
    expect(decodeJwtRole("abc.def")).toBeNull();
  });
});
