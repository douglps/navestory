import { supplierSuggestionsQuerySchema } from "@navestory/validators";
import type { z } from "zod";

// @spec SPEC-20260814-003 RF-01
export const supplierSuggestionsDtoSchema = supplierSuggestionsQuerySchema;
export type SupplierSuggestionsDto = z.infer<
  typeof supplierSuggestionsDtoSchema
>;
