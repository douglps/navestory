/**
 * Nomenclatura canônica do sistema "Em Foco" — fonte única de verdade.
 * @spec SPEC-20260602-001 RNF-05
 */
export const CONTEXT_LABELS = {
  focus: "Em foco",
  allFleet: "Toda a frota",
  swap: "Trocar",
  customSelection: "Seleção personalizada",
  fleetFilter: "Filtro de frota",
  viewAllFleet: "Ver toda a frota",
  selectVehiclePrompt: "Selecionar veículo",
  addVehicleCta: "Adicionar veículo",
} as const;

export const VEHICLE_TYPE_ICONS: Record<string, string> = {
  carro: "🚗",
  moto: "🏍️",
  caminhao: "🚛",
  onibus: "🚌",
  utilitario: "🚐",
  outro: "🚙",
};
