import type { ExternalSyncFields } from "./common";
import type { VehicleStatus } from "./enums";

export interface Vehicle extends ExternalSyncFields {
  id: string;
  plate: string;
  brand: string;
  model: string;
  mileageKm: number;
  status: VehicleStatus;
  /** Technician currently holding the vehicle, if any. */
  assignedTechnicianId: string | null;
  /** Explicit MaxTracker scope metadata; it is never used to infer a driver. */
  organizationId?: string | null;
  regionId?: string | null;
  zoneId?: string | null;
  baseId?: string | null;
}

/** One entry in a vehicle's assignment history. `endAt: null` means it is the current assignment. */
export interface VehicleAssignment {
  id: string;
  vehicleId: string;
  technicianId: string;
  startAt: string;
  endAt: string | null;
}
