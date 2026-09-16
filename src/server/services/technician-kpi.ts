import type { Prisma } from "@prisma/client";
import type { InternalTaskAssignment, TechnicianKpiData, TechnicianKpiWorkItem, TechnicianScoreCategory } from "@/contracts";
import { historicalRejectionCount, normalizePreventiveTemplate, pointsForStatus, splitTechnicianAssignments } from "@/lib/technician-scoring";
import { getPrismaClient } from "@/server/prisma";
import { taskStatus } from "@/server/services/synced-data";
import { assignmentMapKey, listActiveTaskAssignments } from "@/server/services/task-assignments";

export type ScoredRow = {
  id: bigint;
  codigo: string;
  nombre: string | null;
  descripcion: string | null;
  plantilla: string | null;
  proyecto: string | null;
  estado: string | null;
  asignado_a: string | null;
  usuario_colaborador: string | null;
  contratista_asignado: string | null;
  usuarios_responsables_proveedor: string | null;
  cantidad_rechazos: number | null;
  abierto_el: Date | null;
  creado_el: Date | null;
  aprobado_el: Date | null;
  fecha_plan: Date | null;
  actualizado_bd: Date;
};

function clean(value: string | null): string | null {
  const result = value?.trim();
  return result || null;
}

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

export function mapTechnicianWorkItem(row: ScoredRow, kind: TechnicianKpiWorkItem["kind"], internalAssignment?: InternalTaskAssignment): TechnicianKpiWorkItem {
  const category: TechnicianScoreCategory = kind === "CORRECTIVE" ? "CORRECTIVOS" : normalizePreventiveTemplate(row.plantilla);
  const status = taskStatus(row.estado);
  const validForScoring = Boolean(row.codigo.trim()) && status !== "CANCELLED";
  const rejectionCount = historicalRejectionCount(status, row.cantidad_rechazos);
  const directCrewMembers = internalAssignment
    ? [internalAssignment.technicianPrimary, internalAssignment.technicianCollaborator]
    : kind === "CORRECTIVE" ? [] : splitTechnicianAssignments([row.asignado_a, row.usuario_colaborador]);
  const pointsEligible = kind !== "CORRECTIVE" || directCrewMembers.length === 2;
  return {
    id: row.id.toString(),
    code: row.codigo,
    kind,
    template: clean(row.plantilla),
    category,
    project: clean(row.proyecto),
    // No existe un campo de zona/coordinador en estas tablas; no se deriva por nombre, sitio o proyecto.
    zone: null,
    coordinator: null,
    plannedAt: iso(row.fecha_plan),
    originAt: iso(row.abierto_el ?? row.creado_el),
    completedAt: iso(row.aprobado_el),
    rawStatus: row.estado,
    status,
    assignments: directCrewMembers,
    crewMembers: directCrewMembers,
    crewStatus: directCrewMembers.length === 2 ? "COMPLETE" : "CUADRILLA_DATOS_INCOMPLETOS",
    points: validForScoring && pointsEligible ? pointsForStatus(status, category) : 0,
    validForScoring,
    rejectionCount,
  };
}

const workSelect = {
  id: true, codigo: true, nombre: true, descripcion: true, plantilla: true, proyecto: true, estado: true,
  asignado_a: true, usuario_colaborador: true, contratista_asignado: true, usuarios_responsables_proveedor: true,
  cantidad_rechazos: true,
  abierto_el: true, creado_el: true, aprobado_el: true,
  fecha_plan: true, actualizado_bd: true,
} satisfies Prisma.correctivosSelect;

const preventiveSelect = workSelect satisfies Prisma.preventivosSelect;

export async function getTechnicianKpiData(): Promise<TechnicianKpiData> {
  const prisma = getPrismaClient();
  const [correctives, preventives, internalAssignments] = await Promise.all([
    prisma.correctivos.findMany({ select: workSelect, orderBy: { actualizado_bd: "desc" } }),
    prisma.preventivos.findMany({ select: preventiveSelect, orderBy: { actualizado_bd: "desc" } }),
    listActiveTaskAssignments(),
  ]);
  const items = [
    ...correctives.map((row) => mapTechnicianWorkItem(row, "CORRECTIVE", internalAssignments.get(assignmentMapKey("CORRECTIVO", row.codigo)))),
    ...preventives.map((row) => mapTechnicianWorkItem(row, "PREVENTIVE", internalAssignments.get(assignmentMapKey("PREVENTIVO", row.codigo)))),
  ];
  const zones = [...new Set(items.map((item) => item.zone).filter((value): value is string => Boolean(value)))].sort();
  const coordinators = [...new Set(items.map((item) => item.coordinator).filter((value): value is string => Boolean(value)))].sort();
  return { source: "postgresql", items, zones, coordinators };
}
