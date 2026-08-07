import { describe, expect, it } from "vitest";
import {
  loginInputSchema,
  passwordSchema,
  recoverPasswordInputSchema,
  registerInputSchema,
  resetPasswordInputSchema,
} from "./auth.schemas";

describe("passwordSchema", () => {
  it("aceita senha com 6+ chars, letra, número e especial (RF-01)", () => {
    expect(passwordSchema.safeParse("abc12!").success).toBe(true);
  });

  it("rejeita senha curta", () => {
    expect(passwordSchema.safeParse("a1!").success).toBe(false);
  });

  it("rejeita senha sem letra (RF-02)", () => {
    expect(passwordSchema.safeParse("123456!").success).toBe(false);
  });

  it("rejeita senha sem número (RF-02)", () => {
    expect(passwordSchema.safeParse("abcdef!").success).toBe(false);
  });

  it("rejeita senha sem caractere especial (RF-02)", () => {
    expect(passwordSchema.safeParse("abcdef1").success).toBe(false);
  });
});

describe("registerInputSchema", () => {
  it("normaliza e-mail para lowercase", () => {
    const result = registerInputSchema.safeParse({
      name: "Ana",
      email: "Ana@Example.COM",
      password: "abc12!",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("ana@example.com");
      expect(result.data.profile_type).toBe("autonomous");
    }
  });

  it("rejeita nome com menos de 2 caracteres", () => {
    const result = registerInputSchema.safeParse({
      name: "A",
      email: "ana@example.com",
      password: "abc12!",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginInputSchema", () => {
  it("aceita rememberMe opcional com default false", () => {
    const result = loginInputSchema.safeParse({ email: "a@b.com", password: "x" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rememberMe).toBe(false);
    }
  });

  it("remove espaços em branco nas bordas da senha", () => {
    const result = loginInputSchema.safeParse({ email: "a@b.com", password: "  x  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBe("x");
    }
  });

  it("rejeita senha composta só de espaços", () => {
    const result = loginInputSchema.safeParse({ email: "a@b.com", password: "   " });
    expect(result.success).toBe(false);
  });
});

describe("recoverPasswordInputSchema / resetPasswordInputSchema", () => {
  it("valida e-mail em recover-password", () => {
    expect(recoverPasswordInputSchema.safeParse({ email: "invalido" }).success).toBe(false);
  });

  it("valida token+senha em reset-password", () => {
    expect(
      resetPasswordInputSchema.safeParse({ token: "tok", password: "abc12!" }).success,
    ).toBe(true);
  });
});
