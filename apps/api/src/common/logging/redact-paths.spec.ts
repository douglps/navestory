import { redactSensitiveKeys } from "./redact-paths";

// @spec SPEC-20260716-002 RF-11, CA-05
describe("redactSensitiveKeys", () => {
  it("CA-05: redige password para [REDACTED]", () => {
    const result = redactSensitiveKeys({ password: "secret" });
    expect(result).toEqual({ password: "[REDACTED]" });
  });

  it("redige campos que casam com o padrão password|token|secret|key|cpf|ssn (case-insensitive)", () => {
    const result = redactSensitiveKeys({
      accessToken: "a",
      refreshToken: "b",
      service_role_key: "c",
      cpf: "111.111.111-11",
      Secret: "d",
    });
    expect(result).toEqual({
      accessToken: "[REDACTED]",
      refreshToken: "[REDACTED]",
      service_role_key: "[REDACTED]",
      cpf: "[REDACTED]",
      Secret: "[REDACTED]",
    });
  });

  it("redige email, photo_url, authorization e jwt mesmo sem casar o regex", () => {
    const result = redactSensitiveKeys({
      email: "user@example.com",
      photo_url: "https://example.com/foto.jpg",
      authorization: "Bearer abc",
      jwt: "abc.def.ghi",
    });
    expect(result).toEqual({
      email: "[REDACTED]",
      photo_url: "[REDACTED]",
      authorization: "[REDACTED]",
      jwt: "[REDACTED]",
    });
  });

  it("redige em profundidade arbitrária, dentro de objetos e arrays aninhados", () => {
    const result = redactSensitiveKeys({
      user: { profile: { password: "secret" } },
      items: [{ token: "x" }, { safe: "ok" }],
    });
    expect(result).toEqual({
      user: { profile: { password: "[REDACTED]" } },
      items: [{ token: "[REDACTED]" }, { safe: "ok" }],
    });
  });

  it("preserva campos que não são PII", () => {
    const result = redactSensitiveKeys({ statusCode: 200, method: "GET" });
    expect(result).toEqual({ statusCode: 200, method: "GET" });
  });
});
