import { z } from "zod";

/**
 * @spec SPEC-20260602-004
 * 9 categorias padrão do sistema — sugestão inicial, não constraint (ADR-003).
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  { value: "fuel", label: "Combustível" },
  { value: "maintenance", label: "Manutenção" },
  { value: "washing", label: "Lavagem" },
  { value: "toll", label: "Pedágio" },
  { value: "insurance", label: "Seguro" },
  { value: "tax", label: "Imposto" },
  { value: "parking", label: "Estacionamento" },
  { value: "fine", label: "Multa" },
  { value: "other", label: "Outros" },
] as const;

export const DEFAULT_EXPENSE_CATEGORY_VALUES = DEFAULT_EXPENSE_CATEGORIES.map(
  (category) => category.value,
);

/**
 * @spec SPEC-20260602-004 RF-02, R-CAT-02
 */
export const categoryValueSchema = z
  .string()
  .min(1, "Value obrigatório")
  .max(50, "Value deve ter no máximo 50 caracteres")
  .regex(/^[a-z0-9_-]+$/, "Value inválido — use apenas minúsculas, números, hífen e underscore");

export const categoryLabelSchema = z
  .string()
  .min(1, "Label obrigatório")
  .max(100, "Label deve ter no máximo 100 caracteres");

export const createCategoryInputSchema = z.object({
  value: categoryValueSchema,
  label: categoryLabelSchema,
});
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export interface UserCategory {
  id: string;
  user_id: string;
  value: string;
  label: string;
  created_at: string;
}
