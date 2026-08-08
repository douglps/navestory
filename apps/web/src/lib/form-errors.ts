/**
 * Shape estrutural mínimo de um `ZodIssue` — evita depender do pacote `zod` diretamente em
 * `apps/web` (não é dependência direta aqui; só chega via `@navestory/validators`), mantendo
 * compatibilidade com o array retornado por `schema.safeParse(...).error.issues`.
 */
interface FieldIssue {
  path: (string | number)[];
  message: string;
}

/**
 * @spec SPEC-20260807-003 RF-08, R-FORM-08
 * Mapeia os `issues` de um `safeParse` para uma mensagem por campo (primeiro erro de cada
 * `path`), permitindo exibir todos os campos inválidos simultaneamente após a primeira
 * tentativa de submissão — sem depender de react-hook-form (R-FORM-01/02/06 descrevem esse
 * padrão, mas nenhum formulário do projeto o adota hoje; mesma decisão de design já
 * registrada em `apps/web/src/app/(app)/expenses/new/page.tsx`, SPEC-20260619-001).
 */
export function zodIssuesToFieldErrors(issues: FieldIssue[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".") || "_root";
    if (!(key in fieldErrors)) {
      // eslint-disable-next-line security/detect-object-injection -- guardado por `in` acima
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
