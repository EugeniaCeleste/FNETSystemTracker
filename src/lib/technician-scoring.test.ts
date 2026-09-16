import { describe, expect, it } from "vitest";
import { TaskStatus } from "@/contracts";
import { crewKeyForMembers, historicalRejectionCount, TECHNICIAN_SCORING, normalizeCrewMembers, normalizePreventiveTemplate, pointsForStatus, splitTechnicianAssignments } from "./technician-scoring";

describe("technician scoring", () => {
  it("normalizes the real template names and tolerates case/accent variations", () => {
    expect(normalizePreventiveTemplate("Mantenimiento Preventivo Civil - AA")).toBe("AA");
    expect(normalizePreventiveTemplate("mantenimiento preventivo civil - entorno y energía - REDUCIDO")).toBe("ENTORNO_Y_ENERGIA_REDUCIDO");
    expect(normalizePreventiveTemplate("ECP / Mantenimiento Preventivo Civil")).toBe("ECP");
    expect(normalizePreventiveTemplate("GE y AA")).toBe("SIN_CLASIFICAR");
  });

  it("keeps all initial points in one application configuration", () => {
    expect(TECHNICIAN_SCORING.CORRECTIVOS).toBe(15);
    expect(TECHNICIAN_SCORING.AA).toBe(5);
    expect(TECHNICIAN_SCORING.BO).toBe(7);
    expect(TECHNICIAN_SCORING.DT_PREVENTIVO).toBe(6);
    expect(TECHNICIAN_SCORING.ECP).toBe(15);
    expect(TECHNICIAN_SCORING.ENTORNO_Y_ENERGIA).toBe(3);
    expect(TECHNICIAN_SCORING.ENTORNO_Y_ENERGIA_REDUCIDO).toBe(1);
    expect(TECHNICIAN_SCORING.GE).toBe(5);
    expect(TECHNICIAN_SCORING.MOVILIDAD_AL_SITIO).toBe(1);
    expect(TECHNICIAN_SCORING.TORRE).toBe(8);
    expect(TECHNICIAN_SCORING.TORRE_REDUCIDO).toBe(5);
    expect(TECHNICIAN_SCORING.SIN_CLASIFICAR).toBe(0);
  });

  it("deduplicates a two-person crew without dropping either technician", () => {
    expect(splitTechnicianAssignments(["ana@example.com", "ana@example.com", " bruno@example.com "])).toEqual(["ana@example.com", "bruno@example.com"]);
  });

  it("normalizes a crew identity independently of member order", () => {
    expect(normalizeCrewMembers(["Yareco Maximiliano", "Chaves Cristian"])).toEqual(["Chaves Cristian", "Yareco Maximiliano"]);
    expect(crewKeyForMembers(["Chaves Cristian", "Yareco Maximiliano"])).toBe(crewKeyForMembers(["Yareco Maximiliano", "Chaves Cristian"]));
  });

  it("does not create a crew identity for incomplete assignments", () => {
    expect(crewKeyForMembers(["Ana"])).toBeNull();
    expect(crewKeyForMembers(["Ana", "Bruno", "Carla"])).toBeNull();
  });

  it.each([
    [TaskStatus.OPEN, 0],
    [TaskStatus.IN_PROGRESS, 0],
    [TaskStatus.IN_REVIEW, 0],
    [TaskStatus.SENT, 0],
    [TaskStatus.REJECTED, 0],
    [TaskStatus.CANCELLED, 0],
    [TaskStatus.APPROVED, 15],
    [TaskStatus.APPROVED_WITH_PENDING, 15],
  ] as const)("awards productivity points only for approved status: %s", (status, expected) => {
    expect(pointsForStatus(status, "ECP")).toBe(expected);
  });

  it("counts the current rejection even when the source count is empty", () => {
    expect(historicalRejectionCount(TaskStatus.REJECTED, null)).toBe(1);
    expect(historicalRejectionCount(TaskStatus.REJECTED, 3)).toBe(3);
    expect(historicalRejectionCount(TaskStatus.APPROVED, 3)).toBe(3);
  });
});
