import { z } from "zod";

/**
 * @spec SPEC-20260524-002 RF-01, RF-02, RF-03
 * Regra de senha autoritativa (substitui SPEC-20260524-001 §4.1): mínimo 6 caracteres,
 * 1 letra, 1 número, 1 caractere especial.
 */
export const passwordSchema = z
  .string()
  .min(6, "A senha deve ter no mínimo 6 caracteres")
  .regex(/[a-zA-Z]/, "A senha deve conter ao menos uma letra")
  .regex(/[0-9]/, "A senha deve conter ao menos um número")
  .regex(/[^a-zA-Z0-9]/, "A senha deve conter ao menos um caractere especial");

export const profileTypeSchema = z
  .enum(["autonomous", "small_fleet", "large_fleet"])
  .default("autonomous");

/**
 * @spec SPEC-20260524-001 STORY-REG-01, SPEC-20260524-002 RF-01
 */
export const registerInputSchema = z.object({
  name: z.string().min(2, "O nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido").toLowerCase(),
  password: passwordSchema,
  profile_type: profileTypeSchema,
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

/**
 * @spec SPEC-20260524-001 STORY-01
 */
export const loginInputSchema = z.object({
  email: z.string().email("E-mail inválido").toLowerCase(),
  password: z.string().min(1, "Senha obrigatória"),
  rememberMe: z.boolean().optional().default(false),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

/**
 * @spec SPEC-20260524-001 STORY-04
 */
export const recoverPasswordInputSchema = z.object({
  email: z.string().email("E-mail inválido").toLowerCase(),
});
export type RecoverPasswordInput = z.infer<typeof recoverPasswordInputSchema>;

/**
 * @spec SPEC-20260524-001 STORY-05, SPEC-20260524-002 RF-03
 */
export const resetPasswordInputSchema = z.object({
  token: z.string().min(1, "Token obrigatório"),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
