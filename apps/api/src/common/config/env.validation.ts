import Joi from "joi";

/**
 * @spec SPEC-20260521-001 RF-SEC-006
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().default(3001),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_JWT_SECRET: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SWAGGER_ENABLED: Joi.boolean().default(false),
  RESEND_API_KEY: Joi.string().allow("").optional(),
});
