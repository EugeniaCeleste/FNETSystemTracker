import { describe, expect, it } from "vitest";
import { mapTechnicianWorkItem, type ScoredRow } from "./technician-kpi";

function sourceRow(partial: Partial<ScoredRow>): ScoredRow {
  return {
    id: BigInt(1),
    codigo: "TA-1",
    nombre: null,
    descripcion: null,
    plantilla: "ECP",
    proyecto: null,
    estado: "APPROVED",
    asignado_a: null,
    usuario_colaborador: null,
    contratista_asignado: "Empresa contratista",
    usuarios_responsables_proveedor: null,
    cantidad_rechazos: null,
    abierto_el: null,
    creado_el: null,
    aprobado_el: null,
    fecha_plan: null,
    actualizado_bd: new Date("2026-09-01T00:00:00.000Z"),
    ...partial,
  };
}

describe("technician source mapping", () => {
  it("never turns contratista_asignado into a technician or crew member", () => {
    const item = mapTechnicianWorkItem(sourceRow({ contratista_asignado: "Empresa contratista" }), "CORRECTIVE");
    expect(item.assignments).toEqual([]);
    expect(item.crewMembers).toEqual([]);
    expect(item.crewStatus).toBe("CUADRILLA_DATOS_INCOMPLETOS");
  });

  it("keeps official preventive assignments while ignoring contractor data", () => {
    const item = mapTechnicianWorkItem(sourceRow({ asignado_a: "Ana", usuario_colaborador: "Bruno", usuarios_responsables_proveedor: "Empresa" }), "PREVENTIVE");
    expect(item.crewMembers).toEqual(["Ana", "Bruno"]);
    expect(item.assignments).toEqual(["Ana", "Bruno"]);
    expect(item.crewStatus).toBe("COMPLETE");
  });

  it("uses only a valid FNET crew for corrective attribution", () => {
    const withoutInternalCrew = mapTechnicianWorkItem(sourceRow({ asignado_a: "Ana", usuario_colaborador: "Bruno" }), "CORRECTIVE");
    expect(withoutInternalCrew.assignments).toEqual([]);
    expect(withoutInternalCrew.points).toBe(0);

    const withInternalCrew = mapTechnicianWorkItem(sourceRow({ asignado_a: "Empresa", usuario_colaborador: "Última edición" }), "CORRECTIVE", {
      id: "1",
      taskType: "CORRECTIVO",
      taskCode: "TA-1",
      technicianPrimary: "Ana",
      technicianCollaborator: "Bruno",
      assignedAt: "2026-09-01T00:00:00.000Z",
      assignedBy: "DEMO_COORDINATOR",
      updatedAt: "2026-09-01T00:00:00.000Z",
      active: true,
    });
    expect(withInternalCrew.assignments).toEqual(["Ana", "Bruno"]);
    expect(withInternalCrew.points).toBe(15);
  });
});
