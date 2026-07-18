import * as Sentry from "@sentry/nextjs";

/**
 * @spec SPEC-20260716-002 RF-02, CA-08
 * Inicialização client-side do Sentry. `NEXT_PUBLIC_SENTRY_DSN` ausente desabilita
 * o Sentry silenciosamente no browser — `Sentry.init` com `dsn: undefined` é no-op.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  environment: process.env.NODE_ENV ?? "development",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
