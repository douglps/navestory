/**
 * @spec SPEC-20260814-004 RF-01, RF-03
 * `apiClient` (api-client.ts) sempre serializa `body` como JSON — inadequado para
 * `multipart/form-data`. Helper dedicado, mesmo padrão de mesma origem (`/api/backend/*`,
 * cookie httpOnly via `credentials: "include"`) usado pelo resto do app.
 */
export class ReceiptUploadError extends Error {}

export async function uploadExpenseReceipt(
  expenseId: string,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/backend/expenses/${expenseId}/receipt`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new ReceiptUploadError(
      body.message ?? "Não foi possível enviar o comprovante",
    );
  }
}
