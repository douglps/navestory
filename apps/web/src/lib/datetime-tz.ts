/**
 * @spec SPEC-20260715-002 RF-FE-03, RF-FE-04, RF-FE-05, Notas Técnicas 12.2
 * Conversões entre o valor de `<input type="datetime-local">` (sem fuso, "YYYY-MM-DDTHH:mm") e o
 * instante UTC persistido pelo backend (ISO 8601 com offset) — sempre no fuso IANA do usuário.
 */

const FALLBACK_TIMEZONE = "UTC";

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
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
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

/** Valor de `datetime-local` ("YYYY-MM-DDTHH:mm", fuso `tz`) -> ISO 8601 UTC. */
export function datetimeLocalToIso(value: string, tz: string): string {
  const asUtcGuess = new Date(`${value}:00Z`);
  const offsetMinutes = tzOffsetMinutes(asUtcGuess, tz);
  return new Date(asUtcGuess.getTime() - offsetMinutes * 60_000).toISOString();
}

/** ISO 8601 (qualquer offset) -> valor de `datetime-local` no fuso `tz`. */
export function isoToDatetimeLocal(iso: string, tz: string): string {
  return new Date(iso).toLocaleString("sv", { timeZone: tz }).slice(0, 16);
}

/** Hora corrente no fuso `tz`, já no formato esperado por `datetime-local` (RF-FE-03/RF-FE-04). */
export function nowInUserTz(tz: string): string {
  return isoToDatetimeLocal(new Date().toISOString(), tz);
}

/** @spec SPEC-20260715-002 RF-FE-05 — formatação de exibição sempre com `timeZone` explícito */
export function formatDateInTz(iso: string, tz: string | null | undefined): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz ?? FALLBACK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
