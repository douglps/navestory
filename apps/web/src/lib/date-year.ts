/**
 * @spec SPEC-20260612-002 RF-02
 * Altera apenas o ano de uma data `YYYY-MM-DD`, mantendo mês e dia. Datas resultantes
 * inválidas (ex.: 29/02 em ano não bissexto) seguem o comportamento padrão de `Date`
 * (rollover para o mês seguinte), sem ajuste adicional — conforme RF-02.3.
 */
export function changeDateYear(dateStr: string, year: number): string {
  const [, monthStr, dayStr] = dateStr.split("-");
  const month = Number(monthStr ?? 1);
  const day = Number(dayStr ?? 1);
  const adjusted = new Date(year, month - 1, day);
  const pad = (value: number, length: number) => String(value).padStart(length, "0");
  return `${pad(adjusted.getFullYear(), 4)}-${pad(adjusted.getMonth() + 1, 2)}-${pad(adjusted.getDate(), 2)}`;
}
