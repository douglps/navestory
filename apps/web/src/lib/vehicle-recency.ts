const STORAGE_KEY = "nave-recent-vehicle-ids";
const MAX_ENTRIES = 5;

/**
 * Histórico local (localStorage) dos últimos veículos usados em formulários.
 * Alimenta os atalhos do modo `none` em `useVehicleContextField`.
 * @spec SPEC-20260602-001 RF-12
 */
export function recordVehicleAccess(vehicleId: string): void {
  if (typeof window === "undefined") return;

  const current = getRecentVehicleIds(MAX_ENTRIES);
  const next = [vehicleId, ...current.filter((id) => id !== vehicleId)].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getRecentVehicleIds(limit = MAX_ENTRIES): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string").slice(0, limit);
  } catch {
    return [];
  }
}
