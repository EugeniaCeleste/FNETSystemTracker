import type { Prisma } from "@prisma/client";
import type { FuelCharge, FuelMetrics, PendingMetrics, PendingVisit } from "@/contracts";
import { getPrismaClient } from "@/server/prisma";

export interface OperationalFilters {
  from?: string;
  to?: string;
  site?: string;
  origin?: string;
  fuel?: string;
  formulario?: string;
  pendingStatus?: string;
}

function decimalString(value: Prisma.Decimal | null): string | null {
  return value?.toString() ?? null;
}

function dateValue(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function validDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dateFilter(from?: string, to?: string): Prisma.DateTimeNullableFilter {
  const gte = validDate(from);
  const toDate = validDate(to);
  const lte = toDate ? new Date(toDate.setUTCHours(23, 59, 59, 999)) : undefined;
  return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
}

function normalized(value: string | null): string {
  return value?.trim().toUpperCase() ?? "";
}

function fuelWhere(filters: OperationalFilters): Prisma.cargas_combustible_geWhereInput {
  const where: Prisma.cargas_combustible_geWhereInput = {};
  const date = dateFilter(filters.from, filters.to);
  if (Object.keys(date).length > 0) where.fecha_evento = date;
  if (filters.origin) where.origen = filters.origin;
  if (filters.fuel) where.combustible = { contains: filters.fuel, mode: "insensitive" };
  if (filters.formulario) where.formulario = { contains: filters.formulario, mode: "insensitive" };
  if (filters.site) {
    where.OR = [
      { codigo_sitio: { contains: filters.site, mode: "insensitive" } },
      { nombre_sitio: { contains: filters.site, mode: "insensitive" } },
    ];
  }
  return where;
}

function mapFuel(row: {
  id: bigint; formulario: string; codigo_tarea: string | null; codigo_sitio: string | null;
  nombre_sitio: string | null; elemento_red: string | null; estado: string | null; origen: string;
  tipo_formulario: string | null; clave_origen: string; combustible: string | null; tanque: string | null;
  litros_cargados: Prisma.Decimal | null; nivel_antes: Prisma.Decimal | null; nivel_final: Prisma.Decimal | null;
  horometro: Prisma.Decimal | null; ge_en_marcha: boolean | null; fecha_evento: Date | null;
  ultima_edicion_el: Date | null;
}): FuelCharge {
  return {
    id: row.id.toString(), formulario: row.formulario, taskCode: row.codigo_tarea,
    siteCode: row.codigo_sitio, siteName: row.nombre_sitio, networkElement: row.elemento_red,
    status: row.estado, origin: row.origen, formType: row.tipo_formulario, sourceKey: row.clave_origen,
    fuel: row.combustible, tank: row.tanque, liters: decimalString(row.litros_cargados),
    levelBefore: decimalString(row.nivel_antes), levelFinal: decimalString(row.nivel_final),
    hourmeter: decimalString(row.horometro), generatorRunning: row.ge_en_marcha,
    eventAt: dateValue(row.fecha_evento), editedAt: dateValue(row.ultima_edicion_el),
  };
}

function currentMonth(value: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
}

function addMetric(target: Record<string, number>, key: string, value: number): void {
  target[key] = (target[key] ?? 0) + value;
}

function buildFuelMetrics(rows: FuelCharge[]): FuelMetrics {
  const litersByOrigin: Record<string, number> = {};
  const litersBySite: Record<string, number> = {};
  const litersByMonth: Record<string, number> = {};
  let totalLiters = 0;
  let monthLiters = 0;
  let monthCharges = 0;
  let chargesWithLiters = 0;
  for (const row of rows) {
    const liters = row.liters === null ? null : Number(row.liters);
    if (liters === null || Number.isNaN(liters)) continue;
    totalLiters += liters;
    chargesWithLiters += 1;
    addMetric(litersByOrigin, row.origin || "Sin origen", liters);
    addMetric(litersBySite, row.siteCode || row.siteName || "Sin sitio informado", liters);
    const month = row.eventAt?.slice(0, 7) ?? "Sin fecha";
    addMetric(litersByMonth, month, liters);
    if (currentMonth(row.eventAt)) monthLiters += liters;
  }
  monthCharges = rows.filter((row) => currentMonth(row.eventAt)).length;
  return {
    totalLiters, totalCharges: rows.length, monthLiters, monthCharges,
    averageLiters: chargesWithLiters === 0 ? 0 : totalLiters / chargesWithLiters,
    litersByOrigin, litersBySite, litersByMonth,
  };
}

export async function getFuelData(filters: OperationalFilters = {}) {
  const prisma = getPrismaClient();
  const where = fuelWhere(filters);
  const [rows, count] = await Promise.all([
    prisma.cargas_combustible_ge.findMany({
      where,
      orderBy: [{ fecha_evento: "desc" }, { actualizado_bd: "desc" }],
      select: {
        id: true, formulario: true, codigo_tarea: true, codigo_sitio: true, nombre_sitio: true,
        elemento_red: true, estado: true, origen: true, tipo_formulario: true, clave_origen: true,
        combustible: true, tanque: true, litros_cargados: true, nivel_antes: true, nivel_final: true,
        horometro: true, ge_en_marcha: true, fecha_evento: true, ultima_edicion_el: true,
      },
    }),
    prisma.cargas_combustible_ge.count({ where }),
  ]);
  const items = rows.map(mapFuel);
  return { source: "postgresql" as const, count, items, metrics: buildFuelMetrics(items) };
}

function pendingWhere(filters: OperationalFilters): Prisma.pendientes_visitaWhereInput {
  const where: Prisma.pendientes_visitaWhereInput = {};
  if (filters.pendingStatus) where.estado_pendiente = filters.pendingStatus;
  if (filters.origin) where.origen_fuente = filters.origin;
  if (filters.formulario) where.formulario = { contains: filters.formulario, mode: "insensitive" };
  if (filters.site) {
    where.OR = [
      { codigo_sitio: { contains: filters.site, mode: "insensitive" } },
      { nombre_sitio: { contains: filters.site, mode: "insensitive" } },
    ];
  }
  return where;
}

function mapPending(row: {
  id: bigint; formulario: string; origen_fuente: string; clave_origen: string; codigo_sitio: string | null;
  nombre_sitio: string | null; elemento_red: string | null; estado: string | null; grupo: string | null;
  indice: string | null; pregunta: string | null; respuesta: string | null; comentarios: string | null;
  posible_pendiente: boolean | null; ultima_edicion_el: Date | null; ultima_edicion_por: string | null;
  estado_pendiente: string; sincronizado_el: Date | null;
}): PendingVisit {
  return {
    id: row.id.toString(), formulario: row.formulario, source: row.origen_fuente, sourceKey: row.clave_origen,
    siteCode: row.codigo_sitio, siteName: row.nombre_sitio, networkElement: row.elemento_red,
    status: row.estado, group: row.grupo, index: row.indice, question: row.pregunta, answer: row.respuesta,
    comments: row.comentarios, possiblePending: row.posible_pendiente, editedAt: dateValue(row.ultima_edicion_el),
    editedBy: row.ultima_edicion_por, pendingStatus: row.estado_pendiente, syncedAt: dateValue(row.sincronizado_el),
  };
}

function buildPendingMetrics(items: PendingVisit[]): PendingMetrics {
  const bySource: Record<string, number> = {};
  const bySite: Record<string, number> = {};
  const open = items.filter((item) => normalized(item.pendingStatus) === "PENDIENTE");
  for (const item of open) {
    addMetric(bySource, item.source || "Sin origen", 1);
    addMetric(bySite, item.siteCode || item.siteName || "Sin sitio informado", 1);
  }
  return { total: items.length, open: open.length, bySource, bySite };
}

const pendingSelect = {
  id: true, formulario: true, origen_fuente: true, clave_origen: true, codigo_sitio: true,
  nombre_sitio: true, elemento_red: true, estado: true, grupo: true, indice: true, pregunta: true,
  respuesta: true, comentarios: true, posible_pendiente: true, ultima_edicion_el: true,
  ultima_edicion_por: true, estado_pendiente: true, sincronizado_el: true,
} satisfies Prisma.pendientes_visitaSelect;

export async function getPendingData(filters: OperationalFilters = {}) {
  const prisma = getPrismaClient();
  const where = pendingWhere(filters);
  const [rows, count] = await Promise.all([
    prisma.pendientes_visita.findMany({ where, orderBy: { ultima_edicion_el: "desc" }, select: pendingSelect }),
    prisma.pendientes_visita.count({ where }),
  ]);
  const items = rows.map(mapPending);
  return { source: "postgresql" as const, count, items, metrics: buildPendingMetrics(items) };
}

export async function getPendingBySites(siteCodes: string[]): Promise<Record<string, PendingVisit[]>> {
  const codes = [...new Set(siteCodes.map((code) => code.trim()).filter(Boolean))];
  if (codes.length === 0) return {};
  const prisma = getPrismaClient();
  const rows = await prisma.pendientes_visita.findMany({
    where: { codigo_sitio: { in: codes }, estado_pendiente: "PENDIENTE" }, orderBy: { ultima_edicion_el: "desc" }, select: pendingSelect,
  });
  const grouped: Record<string, PendingVisit[]> = {};
  for (const row of rows.map(mapPending)) {
    if (!row.siteCode) continue;
    (grouped[row.siteCode] ??= []).push(row);
  }
  return grouped;
}
