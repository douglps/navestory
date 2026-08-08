/**
 * @spec SPEC-20260602-002 RF-01
 * Compartilhado entre `/vehicles/new` e `/vehicles/[id]` (SPEC-20260807-003 RF-01) — antes
 * duplicado apenas em `/vehicles/new/page.tsx`.
 */
export const VEHICLE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "carro", label: "Carro" },
  { value: "moto", label: "Moto" },
  { value: "caminhao", label: "Caminhão" },
  { value: "onibus", label: "Ônibus" },
  { value: "utilitario", label: "Utilitário" },
  { value: "outro", label: "Outro" },
];
