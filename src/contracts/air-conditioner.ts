/**
 * Future maintenance boundary for site air conditioners.
 * One site may own many independent units; maintenance must never live as a
 * single field on a site or be inferred from a fuzzy form/site-name match.
 */
export const AirConditionerMaintenanceStatus = {
  AL_DIA: "AL_DIA",
  PROXIMO: "PROXIMO",
  VENCE_ESTE_MES: "VENCE_ESTE_MES",
  VENCIDO: "VENCIDO",
} as const;
export type AirConditionerMaintenanceStatus = (typeof AirConditionerMaintenanceStatus)[keyof typeof AirConditionerMaintenanceStatus];

export type AirConditionerMaintenanceType = "FILTER_CHANGE" | "FILTER_CLEANING" | "GENERAL_SERVICE";

export interface AirConditioner {
  id: string;
  siteId: string;
  siteCode: string;
  externalId: string | null;
  equipmentCode: string | null;
  name: string;
  brand: string | null;
  model: string | null;
  capacity: string | null;
  locationInSite: string | null;
  serialNumber: string | null;
  active: boolean;
  notes: string | null;
}

export interface AirConditionerMaintenance {
  id: string;
  airConditionerId: string;
  maintenanceType: AirConditionerMaintenanceType;
  performedAt: string;
  nextDueAt: string | null;
  sytexFormCode: string | null;
  sytexTaskCode: string | null;
  technicianId: string | null;
  notes: string | null;
  rawMetadata: Record<string, unknown> | null;
  supplyIds: string[];
}

export interface AirConditionerMaintenanceInterval {
  maintenanceType: AirConditionerMaintenanceType;
  intervalDays?: number;
  configuredBy: string;
}
