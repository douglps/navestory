/**
 * @spec SPEC-20260716-002 RF-02, CA-08
 * Inicialização server/edge do Sentry via hook nativo do Next.js. `NEXT_PUBLIC_SENTRY_DSN`
 * ausente desabilita o Sentry silenciosamente — `Sentry.init` com `dsn: undefined` é no-op.
 */
export async function register(): Promise<void> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;
  const environment = process.env.NODE_ENV ?? "development";

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({ dsn, environment });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({ dsn, environment });
  }
}
