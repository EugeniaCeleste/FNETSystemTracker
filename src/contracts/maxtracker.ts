import type { ExternalSyncFields } from "./common";

export const DrivingEventType = {
  SPEEDING: "SPEEDING",
  FAULT: "FAULT",
  INCIDENT: "INCIDENT",
} as const;
export type DrivingEventType = (typeof DrivingEventType)[keyof typeof DrivingEventType];

export const DrivingEventSeverity = {
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
} as const;
export type DrivingEventSeverity = (typeof DrivingEventSeverity)[keyof typeof DrivingEventSeverity];

export interface MaxTrackerDrivingProfile extends ExternalSyncFields {
  technicianId: string;
  score: number;
  reputationLabel: "ALTO" | "MEDIO" | "BAJO";
  faultsCount: number;
  speedingCount: number;
  lastEventAt: string | null;
}

export interface MaxTrackerDrivingEvent extends ExternalSyncFields {
  id: string;
  vehicleId: string;
  technicianId: string | null;
  type: DrivingEventType;
  severity: DrivingEventSeverity;
  title: string;
  detail: string;
  occurredAt: string;
  speedKmh: number | null;
  speedLimitKmh: number | null;
}
