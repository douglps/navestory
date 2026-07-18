import * as Sentry from "@sentry/nestjs";

/**
 * @spec SPEC-20260716-002 RF-01, CA-08
 * Deve ser importado antes de qualquer outro módulo em main.ts (requisito do @sentry/nestjs
 * para instrumentação completa). SENTRY_DSN ausente desabilita o Sentry silenciosamente —
 * `Sentry.init` com `dsn: undefined` é um no-op documentado do SDK.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  environment: process.env.NODE_ENV ?? "development",
});
