import { TaskStatus } from "@/contracts";
import type { TechnicianScoreCategory } from "@/contracts/technician-kpi";

export const TECHNICIAN_SCORING: Record<TechnicianScoreCategory, number> = {
  CORRECTIVOS: 15,
  AA: 5,
  BO: 7,
  DT_PREVENTIVO: 6,
  ECP: 15,
  ENTORNO_Y_ENERGIA: 3,
  ENTORNO_Y_ENERGIA_REDUCIDO: 1,
  GE: 5,
  MOVILIDAD_AL_SITIO: 1,
  TORRE: 8,
  TORRE_REDUCIDO: 5,
  SIN_CLASIFICAR: 0,
};

export const TECHNICIAN_SCORE_LABELS: Record<TechnicianScoreCategory, string> = {
  CORRECTIVOS: "Correctivos",
  AA: "AA",
  BO: "BO",
  DT_PREVENTIVO: "DT preventivo",
  ECP: "ECP",
  ENTORNO_Y_ENERGIA: "Entorno y energía",
  ENTORNO_Y_ENERGIA_REDUCIDO: "Entorno y energía reducido",
  GE: "GE",
  MOVILIDAD_AL_SITIO: "Movilidad al sitio",
  TORRE: "Torre",
  TORRE_REDUCIDO: "Torre reducido",
  SIN_CLASIFICAR: "Sin clasificar",
};

export const TECHNICIAN_SCORE_CATEGORIES = Object.keys(TECHNICIAN_SCORING) as TechnicianScoreCategory[];

function normalizedTemplate(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

/**
 * Maps only recognizable template signatures. Multiple category matches are
 * intentionally rejected so an ambiguous source value stays visible for review.
 */
export function normalizePreventiveTemplate(template: string | null | undefined): Exclude<TechnicianScoreCategory, "CORRECTIVOS"> {
  if (!template?.trim()) return "SIN_CLASIFICAR";
  const value = normalizedTemplate(template);
  const candidates: Exclude<TechnicianScoreCategory, "CORRECTIVOS">[] = [];
  const add = (category: Exclude<TechnicianScoreCategory, "CORRECTIVOS">) => candidates.push(category);

  if (/ENTORNO Y ENERGIA(?: REDUCIDO)?/.test(value)) add(value.includes("ENTORNO Y ENERGIA REDUCIDO") ? "ENTORNO_Y_ENERGIA_REDUCIDO" : "ENTORNO_Y_ENERGIA");
  if (/MOVILIDAD AL SITIO/.test(value)) add("MOVILIDAD_AL_SITIO");
  if (/\bDT\s+PREVENTIVO\b/.test(value)) add("DT_PREVENTIVO");
  if (/\bTORRE REDUCIDO\b/.test(value)) add("TORRE_REDUCIDO");
  else if (/\bTORRE\b/.test(value)) add("TORRE");
  if (/\bECP\b/.test(value)) add("ECP");
  if (/\bGE\b/.test(value)) add("GE");
  if (/\bAA\b/.test(value)) add("AA");
  if (/\bBO\b/.test(value)) add("BO");

  return candidates.length === 1 ? candidates[0] : "SIN_CLASIFICAR";
}

export function splitTechnicianAssignments(values: Array<string | null | undefined>): string[] {
  const names = values.flatMap((value) => value?.split(/[;,|\n]+/) ?? []).map((value) => value.trim()).filter(Boolean);
  return [...new Set(names)];
}

export function normalizeCrewMembers(values: Array<string | null | undefined>): string[] {
  return splitTechnicianAssignments(values).sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));
}

export function crewKeyForMembers(values: Array<string | null | undefined>): string | null {
  const members = normalizeCrewMembers(values);
  return members.length === 2 ? members.join(" + ") : null;
}

export function isProductivityPending(status: string): boolean {
  return status !== "APPROVED" && status !== "CANCELLED";
}

export function isProductivityCompleted(status: TaskStatus): boolean {
  return status === TaskStatus.APPROVED || status === TaskStatus.APPROVED_WITH_PENDING;
}

export function pointsForStatus(status: TaskStatus, category: TechnicianScoreCategory): number {
  return isProductivityCompleted(status) ? TECHNICIAN_SCORING[category] : 0;
}

export function historicalRejectionCount(status: TaskStatus, count: number | null | undefined): number {
  const available = Math.max(0, count ?? 0);
  return status === TaskStatus.REJECTED ? Math.max(1, available) : available;
}
