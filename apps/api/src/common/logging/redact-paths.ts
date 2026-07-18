/**
 * @spec SPEC-20260716-002 RF-11
 * Aplica S10 — logs nunca contêm PII ou dados sensíveis.
 */

const REDACTED = "[REDACTED]";

/** Caminhos estáticos conhecidos, usados pela opção nativa `redact` do Pino. */
export const PINO_REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "body.password",
  "body.token",
  "body.accessToken",
  "body.refreshToken",
  "body.jwt",
  "body.service_role_key",
  "body.cpf",
  "body.email",
  "body.photo_url",
  "*.password",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.jwt",
  "*.authorization",
  "*.service_role_key",
  "*.cpf",
  "*.email",
  "*.photo_url",
];

/** Campos redigidos automaticamente por padrão de nome, em qualquer profundidade. */
const PII_KEY_PATTERN = /password|token|secret|key|cpf|ssn/i;

/** Campos que não casam com PII_KEY_PATTERN mas ainda assim são PII (RF-11). */
const EXPLICIT_PII_KEYS = new Set(["email", "photo_url", "authorization", "jwt"]);

function isPiiKey(key: string): boolean {
  return PII_KEY_PATTERN.test(key) || EXPLICIT_PII_KEYS.has(key.toLowerCase());
}

/**
 * Percorre recursivamente um objeto de log e substitui por `[REDACTED]` qualquer
 * campo cujo nome case com PII_KEY_PATTERN ou EXPLICIT_PII_KEYS — captura PII em
 * profundidade arbitrária, não coberta pelos caminhos estáticos de PINO_REDACT_PATHS.
 */
export function redactSensitiveKeys<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (Array.isArray(value)) {
    return value.map((item: unknown) => redactSensitiveKeys(item, seen)) as unknown as T;
  }

  if (value !== null && typeof value === "object") {
    if (seen.has(value as object)) {
      return value;
    }
    seen.add(value as object);

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // eslint-disable-next-line security/detect-object-injection -- key vem das próprias chaves do objeto de log, não de input externo
      result[key] = isPiiKey(key) ? REDACTED : redactSensitiveKeys(val, seen);
    }
    return result as T;
  }

  return value;
}
