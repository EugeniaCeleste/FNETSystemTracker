import { describe, expect, it } from "vitest";
import { UserRole, VehicleStatus } from "@/contracts";
import { mockMaxTrackerDrivingEvents, mockMaxTrackerDrivingProfiles, mockScopeForRole, mockTechnicians, mockVehicles, scopedResourceForZone } from "@/mocks";
import { createMockSourceAdapters } from "@/server/adapters/mock-source-adapters";
import { filterVehiclesForScope } from "./scope";

describe("MaxTracker mock-first scope", () => {
  it("keeps an explicit unassigned vehicle visible to an in-scope coordinator", async () => {
    const vehicles = await createMockSourceAdapters().maxtracker.getVehiclesForScope(mockScopeForRole(UserRole.COORDINATOR));
    expect(vehicles.some((vehicle) => vehicle.assignedTechnicianId === null)).toBe(true);
    expect(vehicles.some((vehicle) => vehicle.id === "veh-05")).toBe(false);
  });

  it("does not expose a vehicle assigned to another technician", () => {
    const vehicles = filterVehiclesForScope(mockVehicles, mockTechnicians, mockScopeForRole(UserRole.TECHNICIAN), scopedResourceForZone);
    expect(vehicles.map((vehicle) => vehicle.assignedTechnicianId)).toEqual(["tech-01"]);
  });

  it("keeps driving profiles and events scoped to visible vehicles", async () => {
    const adapter = createMockSourceAdapters().maxtracker;
    const scope = mockScopeForRole(UserRole.COORDINATOR);
    const vehicles = await adapter.getVehiclesForScope(scope);
    const profiles = await adapter.getDrivingProfilesForScope(scope);
    const events = await adapter.getDrivingEventsForScope(scope);
    expect(profiles.every((profile) => vehicles.some((vehicle) => vehicle.assignedTechnicianId === profile.technicianId))).toBe(true);
    expect(events.every((event) => vehicles.some((vehicle) => vehicle.id === event.vehicleId))).toBe(true);
    expect(mockMaxTrackerDrivingProfiles.length).toBeGreaterThan(0);
    expect(mockMaxTrackerDrivingEvents.length).toBeGreaterThan(0);
  });

  it("contains the operational vehicle states required by the UI fixture", () => {
    expect(mockVehicles.some((vehicle) => vehicle.status === VehicleStatus.MAINTENANCE)).toBe(true);
    expect(mockVehicles.some((vehicle) => vehicle.status === VehicleStatus.OUT_OF_SERVICE)).toBe(true);
    expect(mockVehicles.some((vehicle) => vehicle.assignedTechnicianId === null)).toBe(true);
  });
});
