import { envValidationSchema } from "./env.validation";

const validEnv = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

describe("envValidationSchema", () => {
  it("aceita env válido com defaults aplicados", () => {
    const { error, value } = envValidationSchema.validate(validEnv);

    expect(error).toBeUndefined();
    expect(value.NODE_ENV).toBe("development");
    expect(value.PORT).toBe(3001);
    expect(value.SWAGGER_ENABLED).toBe(false);
  });

  it("rejeita quando SUPABASE_URL está ausente", () => {
    const rest: Partial<typeof validEnv> = { ...validEnv };
    delete rest.SUPABASE_URL;
    const { error } = envValidationSchema.validate(rest);

    expect(error).toBeDefined();
  });

  it("rejeita quando SUPABASE_SERVICE_ROLE_KEY está ausente (RF-SEC-006)", () => {
    const rest: Partial<typeof validEnv> = { ...validEnv };
    delete rest.SUPABASE_SERVICE_ROLE_KEY;
    const { error } = envValidationSchema.validate(rest);

    expect(error).toBeDefined();
  });
});
