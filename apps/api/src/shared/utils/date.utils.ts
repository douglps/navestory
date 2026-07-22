/**
 * @spec SPEC-20260715-002 RF-BK-04, RF-BK-05, R-TZ-01, R-TZ-02
 * Fuso do usuário: fallback quando `user_preferences.timezone` é `null`/ausente ou inválido —
 * nunca o fuso implícito do SO/processo Node.js (nota técnica 12.4 da spec).
 */
export const FALLBACK_TIMEZONE = "UTC";

/**
 * @spec SPEC-20260715-002 Notas Técnicas 12.1
 * Dia calendário (`YYYY-MM-DD`) de `date` no fuso IANA `tz` — substitui `toDateString` (UTC) nos
 * pontos em que "hoje" precisa refletir o fuso do usuário autenticado, não o do servidor.
 */
export function toCalendarDay(date: Date, tz: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * @spec SPEC-20260715-002 RF-BK-06, RF-BK-07
 * Aceita `YYYY-MM-DD` (compatibilidade retroativa) ou ISO 8601 com offset; no primeiro caso,
 * interpreta como `00:00:00` no fuso informado antes de converter para o instante UTC persistido.
 */
export function resolveDateTimeInput(value: string, tz: string): string {
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnlyPattern.test(value)) {
    const asUtcMidnight = new Date(`${value}T00:00:00Z`);
    const offsetMinutes = tzOffsetMinutes(asUtcMidnight, tz);
    return new Date(asUtcMidnight.getTime() - offsetMinutes * 60_000).toISOString();
  }
  return new Date(value).toISOString();
}

/**
 * Limite superior exclusivo (UTC) do dia calendário `dateOnly` (`YYYY-MM-DD`) — usado para
 * converter filtros `date_to`/`to` (antes comparados por igualdade de `DATE`) em `.lt()` sobre
 * `timestamptz`, preservando o dia inteiro como incluído (RNF-03 — sem regressão na migração).
 */
export function exclusiveDayUpperBoundUtc(dateOnly: string): string {
  const next = new Date(`${dateOnly}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

/** Offset (minutos, leste positivo) de `tz` no instante `date` — usado para interpretar `YYYY-MM-DD` como meia-noite local. */
function tzOffsetMinutes(date: Date, tz: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asIfUtc - date.getTime()) / 60_000);
}
