import type { Prisma } from "@prisma/client";
import type { CorrectiveAnalyticsData, CorrectiveAnalyticsRow, InternalTaskAssignment, PostgresQuote } from "@/contracts";
import { classifyWorkType } from "@/lib/corrective-rules";
import { getPrismaClient } from "@/server/prisma";
import { getPendingBySites } from "@/server/services/operational-data";
import { quoteStatus, taskCriticality, taskPriority, taskStatus } from "@/server/services/synced-data";
import { assignmentMapKey, listActiveTaskAssignments } from "@/server/services/task-assignments";

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function clean(value: string | null): string | null {
  const result = value?.trim();
  return result || null;
}

function decimal(value: Prisma.Decimal | null): string | null {
  return value?.toString() ?? null;
}

function mapQuote(row: {
  id: bigint;
  codigo: string;
  estado: string | null;
  proyecto: string | null;
  proveedor: string | null;
  total: Prisma.Decimal | null;
  divisa: string | null;
  codigo_tarea: string | null;
  codigo_sitio: string | null;
  nombre_sitio: string | null;
  fecha_creacion: Date | null;
  actualizado_bd: Date;
  enlace: string | null;
}): PostgresQuote {
  return {
    id: row.id.toString(),
    code: row.codigo,
    status: quoteStatus(row.estado),
    zoneId: row.codigo_sitio ?? "Sin sitio informado",
    projectId: row.proyecto,
    supplier: row.proveedor,
    total: decimal(row.total),
    currency: row.divisa,
    taskCode: row.codigo_tarea,
    relatedCorrectiveCode: row.codigo_tarea,
    siteCode: row.codigo_sitio,
    siteName: row.nombre_sitio,
    createdAt: iso(row.fecha_creacion),
    updatedAt: row.actualizado_bd.toISOString(),
    link: row.enlace,
  };
}

function mapCorrective(row: {
  id: bigint;
  codigo: string;
  nombre: string | null;
  descripcion: string | null;
  tarea: string | null;
  estado: string | null;
  proyecto: string | null;
  plantilla: string | null;
  codigos_sitios_afectados: string | null;
  nombres_sitios_afectados: string | null;
  atributos: string | null;
  solicitado_por: string | null;
  contratista_asignado: string | null;
  usuarios_responsables_proveedor: string | null;
  asignado_a: string | null;
  usuario_colaborador: string | null;
  fecha_plan: Date | null;
  creado_el: Date | null;
  abierto_el: Date | null;
  enlace: string | null;
}, quotes: PostgresQuote[], internalAssignment: InternalTaskAssignment | null): CorrectiveAnalyticsRow {
  const originDate = row.abierto_el ?? row.creado_el;
  return {
    id: row.id.toString(),
    code: row.codigo,
    description: row.nombre ?? row.descripcion ?? row.tarea ?? "Sin descripción informada",
    rawStatus: row.estado,
    status: taskStatus(row.estado),
    project: clean(row.proyecto),
    siteCode: clean(row.codigos_sitios_afectados),
    siteName: clean(row.nombres_sitios_afectados),
    template: clean(row.plantilla),
    originDate: iso(originDate),
    originDateSource: row.abierto_el ? "abierto_el" : row.creado_el ? "creado_el" : null,
    plannedAt: iso(row.fecha_plan),
    workType: classifyWorkType([row.nombre, row.descripcion, row.tarea, row.plantilla]),
    criticality: taskCriticality(taskPriority(row.atributos), row.estado),
    responsible: clean(row.asignado_a),
    collaborator: clean(row.usuario_colaborador),
    contractor: clean(row.contratista_asignado),
    supplierResponsibles: clean(row.usuarios_responsables_proveedor),
    internalAssignment,
    link: clean(row.enlace),
    quotes,
  };
}

export async function getCorrectiveAnalytics(): Promise<CorrectiveAnalyticsData> {
  const prisma = getPrismaClient();
  const [rows, quoteRows, internalAssignments] = await Promise.all([
    prisma.correctivos.findMany({
      select: {
        id: true, codigo: true, nombre: true, descripcion: true, tarea: true, estado: true,
        proyecto: true, plantilla: true, codigos_sitios_afectados: true, nombres_sitios_afectados: true,
        atributos: true, solicitado_por: true, contratista_asignado: true, usuarios_responsables_proveedor: true,
        asignado_a: true, usuario_colaborador: true, fecha_plan: true, creado_el: true, abierto_el: true, enlace: true,
      },
      orderBy: { actualizado_bd: "desc" },
    }),
    prisma.cotizaciones.findMany({
      select: {
        id: true, codigo: true, estado: true, proyecto: true, proveedor: true, total: true, divisa: true,
        codigo_tarea: true, codigo_sitio: true, nombre_sitio: true, fecha_creacion: true, actualizado_bd: true, enlace: true,
      },
      orderBy: { actualizado_bd: "desc" },
    }),
    listActiveTaskAssignments(),
  ]);
  const quotes = quoteRows.map(mapQuote);
  const quotesByTask = new Map<string, PostgresQuote[]>();
  for (const quote of quotes) {
    if (!quote.taskCode) continue;
    quotesByTask.set(quote.taskCode, [...(quotesByTask.get(quote.taskCode) ?? []), quote]);
  }
  const items = rows.map((row) => mapCorrective(row, quotesByTask.get(row.codigo) ?? [], internalAssignments.get(assignmentMapKey("CORRECTIVO", row.codigo)) ?? null));
  const pendingBySite = await getPendingBySites(items.map((item) => item.siteCode).filter((value): value is string => Boolean(value)));
  return { source: "postgresql", items, pendingBySite };
}
