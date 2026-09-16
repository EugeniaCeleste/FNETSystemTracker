import type { PreventiveAnalyticsData, PreventiveAnalyticsRow, PreventiveProjectStatusSummary, PreventiveSiteSummary } from "@/contracts";
import { TaskStatus } from "@/contracts";
import { getPrismaClient } from "@/server/prisma";
import { getPendingBySites } from "@/server/services/operational-data";
import { taskStatus } from "@/server/services/synced-data";

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function clean(value: string | null): string | null {
  const result = value?.trim();
  return result || null;
}

function mapPreventive(row: {
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
  solicitado_por: string | null;
  contratista_asignado: string | null;
  usuarios_responsables_proveedor: string | null;
  asignado_a: string | null;
  usuario_colaborador: string | null;
  fecha_plan: Date | null;
  creado_el: Date | null;
  abierto_el: Date | null;
  aprobado_el: Date | null;
  rechazado_el: Date | null;
  cancelado_el: Date | null;
  enlace: string | null;
}): PreventiveAnalyticsRow {
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
    plannedAt: iso(row.fecha_plan),
    createdAt: iso(row.creado_el),
    requestedAt: iso(row.abierto_el),
    approvedAt: iso(row.aprobado_el),
    rejectedAt: iso(row.rechazado_el),
    cancelledAt: iso(row.cancelado_el),
    requestedBy: clean(row.solicitado_por),
    responsible: clean(row.asignado_a),
    collaborator: clean(row.usuario_colaborador),
    contractor: clean(row.contratista_asignado),
    supplierResponsibles: clean(row.usuarios_responsables_proveedor),
    link: clean(row.enlace),
  };
}

function summarizeSites(items: PreventiveAnalyticsRow[], pendingBySite: Record<string, import("@/contracts").PendingVisit[]>): PreventiveSiteSummary[] {
  const grouped = new Map<string, PreventiveAnalyticsRow[]>();
  for (const item of items) {
    if (!item.siteCode) continue;
    grouped.set(item.siteCode, [...(grouped.get(item.siteCode) ?? []), item]);
  }
  return [...grouped.entries()].map(([siteCode, forms]) => {
    const approved = forms.filter((form) => form.status === TaskStatus.APPROVED).length;
    return {
      siteCode,
      siteName: forms.find((form) => form.siteName)?.siteName ?? null,
      total: forms.length,
      approved,
      pending: forms.length - approved,
      complete: forms.length > 0 && approved === forms.length,
      forms,
      previousVisitPending: pendingBySite[siteCode] ?? [],
    };
  }).sort((left, right) => left.siteCode.localeCompare(right.siteCode));
}

function summarizeProjects(items: PreventiveAnalyticsRow[]): PreventiveProjectStatusSummary[] {
  const grouped = new Map<string, number>();
  for (const item of items) {
    const project = item.project ?? "Sin proyecto informado";
    const key = `${project}\u0000${item.status}`;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }
  return [...grouped.entries()].map(([key, count]) => {
    const [project, status] = key.split("\u0000");
    return { project, status: status as PreventiveProjectStatusSummary["status"], count };
  }).sort((left, right) => left.project.localeCompare(right.project) || left.status.localeCompare(right.status));
}

export async function getPreventiveAnalytics(): Promise<PreventiveAnalyticsData> {
  const prisma = getPrismaClient();
  const rows = await prisma.preventivos.findMany({
    select: {
      id: true, codigo: true, nombre: true, descripcion: true, tarea: true, estado: true,
      proyecto: true, plantilla: true, codigos_sitios_afectados: true, nombres_sitios_afectados: true,
      solicitado_por: true, contratista_asignado: true, usuarios_responsables_proveedor: true,
      asignado_a: true, usuario_colaborador: true, fecha_plan: true, creado_el: true, abierto_el: true,
      aprobado_el: true, rechazado_el: true, cancelado_el: true, enlace: true,
    },
    orderBy: { actualizado_bd: "desc" },
  });
  const items = rows.map(mapPreventive);
  const pendingBySite = await getPendingBySites(items.map((item) => item.siteCode).filter((value): value is string => Boolean(value)));
  return { source: "postgresql", items, sites: summarizeSites(items, pendingBySite), projectStatuses: summarizeProjects(items) };
}
