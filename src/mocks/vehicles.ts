import type { MaxTrackerDrivingEvent, MaxTrackerDrivingProfile, Vehicle, VehicleAssignment } from "@/contracts";
import { ExternalSource, VehicleStatus } from "@/contracts";

interface VehicleSeed {
  id: string;
  plate: string;
  brand: string;
  model: string;
  mileageKm: number;
  status: VehicleStatus;
  assignedTechnicianId: string | null;
  organizationId: string;
  regionId: string;
  zoneId: string;
  baseId: string;
}

const seeds: VehicleSeed[] = [
  { id: "veh-01", plate: "AB101CD", brand: "Toyota", model: "Hilux", mileageKm: 68500, status: VehicleStatus.ACTIVE, assignedTechnicianId: "tech-01", organizationId: "org-fnet-ar", regionId: "region-north", zoneId: "zone-noa", baseId: "base-salta" },
  { id: "veh-02", plate: "AB102CD", brand: "Toyota", model: "Hilux", mileageKm: 71230, status: VehicleStatus.ACTIVE, assignedTechnicianId: "tech-04", organizationId: "org-fnet-ar", regionId: "region-north", zoneId: "zone-nea", baseId: "base-corrientes" },
  { id: "veh-03", plate: "AB103CD", brand: "Volkswagen", model: "Amarok", mileageKm: 54300, status: VehicleStatus.ACTIVE, assignedTechnicianId: "tech-06", organizationId: "org-fnet-ar", regionId: "region-central", zoneId: "zone-cuyo", baseId: "base-mendoza" },
  { id: "veh-04", plate: "AB104CD", brand: "Renault", model: "Kangoo", mileageKm: 39800, status: VehicleStatus.ACTIVE, assignedTechnicianId: "tech-09", organizationId: "org-fnet-ar", regionId: "region-central", zoneId: "zone-centro", baseId: "base-cordoba" },
  { id: "veh-05", plate: "AB105CD", brand: "Toyota", model: "Hilux", mileageKm: 82100, status: VehicleStatus.ACTIVE, assignedTechnicianId: "tech-12", organizationId: "org-fnet-ar", regionId: "region-south", zoneId: "zone-patagonia", baseId: "base-neuquen" },
  { id: "veh-06", plate: "AB106CD", brand: "Fiat", model: "Strada", mileageKm: 45600, status: VehicleStatus.ACTIVE, assignedTechnicianId: "tech-03", organizationId: "org-fnet-ar", regionId: "region-north", zoneId: "zone-noa", baseId: "base-salta" },
  { id: "veh-07", plate: "AB107CD", brand: "Renault", model: "Kangoo", mileageKm: 91200, status: VehicleStatus.MAINTENANCE, assignedTechnicianId: "tech-08", organizationId: "org-fnet-ar", regionId: "region-central", zoneId: "zone-cuyo", baseId: "base-mendoza" },
  { id: "veh-08", plate: "AB108CD", brand: "Volkswagen", model: "Amarok", mileageKm: 103400, status: VehicleStatus.OUT_OF_SERVICE, assignedTechnicianId: null, organizationId: "org-fnet-ar", regionId: "region-north", zoneId: "zone-nea", baseId: "base-corrientes" },
];

export const mockVehicles: Vehicle[] = seeds.map((seed) => ({
  ...seed,
  externalId: `MT-VEH-${seed.id.slice(-2)}`,
  externalSource: ExternalSource.MAXTRACKER,
  sourceUpdatedAt: "2026-08-17T18:00:00.000Z",
}));

export const mockVehicleAssignments: VehicleAssignment[] = [
  { id: "va-01", vehicleId: "veh-01", technicianId: "tech-01", startAt: "2026-06-01T08:00:00.000Z", endAt: null },
  { id: "va-02", vehicleId: "veh-04", technicianId: "tech-11", startAt: "2026-03-01T08:00:00.000Z", endAt: "2026-07-15T08:00:00.000Z" },
  { id: "va-03", vehicleId: "veh-04", technicianId: "tech-09", startAt: "2026-07-15T08:00:00.000Z", endAt: null },
];

export const mockMaxTrackerDrivingProfiles: MaxTrackerDrivingProfile[] = [
  { technicianId: "tech-01", score: 94, reputationLabel: "ALTO", faultsCount: 0, speedingCount: 1, lastEventAt: "2026-08-12T14:30:00.000Z", externalId: "MT-DRV-01", externalSource: ExternalSource.MAXTRACKER, sourceUpdatedAt: "2026-08-17T18:00:00.000Z" },
  { technicianId: "tech-04", score: 81, reputationLabel: "MEDIO", faultsCount: 1, speedingCount: 2, lastEventAt: "2026-08-11T16:10:00.000Z", externalId: "MT-DRV-04", externalSource: ExternalSource.MAXTRACKER, sourceUpdatedAt: "2026-08-17T18:00:00.000Z" },
  { technicianId: "tech-06", score: 67, reputationLabel: "BAJO", faultsCount: 2, speedingCount: 3, lastEventAt: "2026-08-10T11:45:00.000Z", externalId: "MT-DRV-06", externalSource: ExternalSource.MAXTRACKER, sourceUpdatedAt: "2026-08-17T18:00:00.000Z" },
  { technicianId: "tech-09", score: 88, reputationLabel: "ALTO", faultsCount: 0, speedingCount: 0, lastEventAt: null, externalId: "MT-DRV-09", externalSource: ExternalSource.MAXTRACKER, sourceUpdatedAt: "2026-08-17T18:00:00.000Z" },
  { technicianId: "tech-12", score: 76, reputationLabel: "MEDIO", faultsCount: 1, speedingCount: 0, lastEventAt: "2026-08-09T09:20:00.000Z", externalId: "MT-DRV-12", externalSource: ExternalSource.MAXTRACKER, sourceUpdatedAt: "2026-08-17T18:00:00.000Z" },
];

export const mockMaxTrackerDrivingEvents: MaxTrackerDrivingEvent[] = [
  { id: "drv-event-01", vehicleId: "veh-01", technicianId: "tech-01", type: "SPEEDING", severity: "WARNING", title: "Exceso de velocidad", detail: "82 km/h en tramo de 80 km/h", occurredAt: "2026-08-12T14:30:00.000Z", speedKmh: 82, speedLimitKmh: 80, externalId: "MT-EVT-01", externalSource: ExternalSource.MAXTRACKER, sourceUpdatedAt: "2026-08-17T18:00:00.000Z" },
  { id: "drv-event-02", vehicleId: "veh-02", technicianId: "tech-04", type: "FAULT", severity: "CRITICAL", title: "Frenada brusca", detail: "Evento de conducción registrado por MaxTracker", occurredAt: "2026-08-11T16:10:00.000Z", speedKmh: null, speedLimitKmh: null, externalId: "MT-EVT-02", externalSource: ExternalSource.MAXTRACKER, sourceUpdatedAt: "2026-08-17T18:00:00.000Z" },
  { id: "drv-event-03", vehicleId: "veh-03", technicianId: "tech-06", type: "SPEEDING", severity: "WARNING", title: "Exceso de velocidad", detail: "104 km/h en tramo de 90 km/h", occurredAt: "2026-08-10T11:45:00.000Z", speedKmh: 104, speedLimitKmh: 90, externalId: "MT-EVT-03", externalSource: ExternalSource.MAXTRACKER, sourceUpdatedAt: "2026-08-17T18:00:00.000Z" },
];
