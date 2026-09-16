/**
 * Extensible contract reserved for the future Grupo Electrógeno module.
 * It is intentionally not persisted or exposed in the prototype yet.
 */
export const GeneratorMaintenanceStatus = {
  AL_DIA: "AL_DIA",
  PROXIMO: "PROXIMO",
  VENCE_ESTE_MES: "VENCE_ESTE_MES",
  VENCIDO: "VENCIDO",
} as const;
export type GeneratorMaintenanceStatus = (typeof GeneratorMaintenanceStatus)[keyof typeof GeneratorMaintenanceStatus];

export type GeneratorMaintenanceKind =
  | "SERVICE"
  | "OIL_CHANGE"
  | "OIL_FILTER"
  | "FUEL_FILTER"
  | "AIR_FILTER"
  | "BATTERY";

export interface GeneratorMaintenanceInterval {
  kind: GeneratorMaintenanceKind;
  intervalDays?: number;
  intervalHours?: number;
  configuredBy: string;
}

export interface GeneratorServiceRecord {
  id: string;
  generatorId: string;
  performedAt: string;
  hourmeter: number | null;
  kind: GeneratorMaintenanceKind;
  notes: string | null;
  relatedPreventiveId: string | null;
  supplyIds: string[];
}

export interface GeneratorEquipment {
  id: string;
  siteId: string;
  siteCode: string;
  name: string;
  brand: string | null;
  model: string | null;
  hourmeter: number | null;
  lastServiceAt: string | null;
  lastServiceHourmeter: number | null;
  nextServiceAt: string | null;
  batteryInstalledAt: string | null;
  batteryReplacementAt: string | null;
  observations: string | null;
  maintenanceStatus: GeneratorMaintenanceStatus;
  intervalIds: string[];
}
