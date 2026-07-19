function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return isSameCalendarDay(date, yesterday);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatShortDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

/**
 * "Hoje HH:mm" / "Ontem HH:mm" / "DD/MM/AA HH:mm", calculado em calendário local.
 * valida R-PWA-07
 *
 * @spec SPEC-20260712-001 RF-13.1
 */
export function formatCacheAge(date: Date, now: Date = new Date()): string {
  const time = formatTime(date);
  if (isSameCalendarDay(date, now)) return `Hoje ${time}`;
  if (isYesterday(date, now)) return `Ontem ${time}`;
  return `${formatShortDate(date)} ${time}`;
}
