import type { TaskStatus } from "./enums";

export type TechnicianScoreCategory =
  | "CORRECTIVOS"
  | "AA"
  | "BO"
  | "DT_PREVENTIVO"
  | "ECP"
  | "ENTORNO_Y_ENERGIA"
  | "ENTORNO_Y_ENERGIA_REDUCIDO"
  | "GE"
  | "MOVILIDAD_AL_SITIO"
  | "TORRE"
  | "TORRE_REDUCIDO"
  | "SIN_CLASIFICAR";

export type TechnicianWorkKind = "CORRECTIVE" | "PREVENTIVE";
export type TechnicianCrewDataStatus = "COMPLETE" | "CUADRILLA_DATOS_INCOMPLETOS";

export interface TechnicianKpiWorkItem {
  id: string;
  code: string;
  kind: TechnicianWorkKind;
  template: string | null;
  category: TechnicianScoreCategory;
  project: string | null;
  zone: string | null;
  coordinator: string | null;
  plannedAt: string | null;
  rawStatus: string | null;
  status: TaskStatus;
  assignments: string[];
  crewMembers: string[];
  crewStatus: TechnicianCrewDataStatus;
  originAt: string | null;
  completedAt: string | null;
  points: number;
  validForScoring: boolean;
  rejectionCount: number;
}

export interface TechnicianKpiData {
  source: "postgresql";
  items: TechnicianKpiWorkItem[];
  zones: string[];
  coordinators: string[];
}

export interface TechnicianCategoryBreakdown {
  count: number;
  approved: number;
  points: number;
}

export interface TechnicianRankingRow {
  technician: string;
  zone: string | null;
  points: number;
  tasks: number;
  preventives: number;
  correctives: number;
  approved: number;
  rejected: number;
  rejections: number;
  pending: number;
  compliance: number;
  averagePointsPerDay: number;
  breakdown: Record<TechnicianScoreCategory, TechnicianCategoryBreakdown>;
}

export interface TechnicianCrewRankingRow {
  crewKey: string;
  crewLabel: string;
  members: string[];
  points: number;
  tasks: number;
  preventives: number;
  correctives: number;
  approved: number;
  approvedWithPending: number;
  rejected: number;
  rejections: number;
  pending: number;
  compliance: number;
  averagePointsPerDay: number;
  averageTaskDurationDays: number | null;
  breakdown: Record<TechnicianScoreCategory, TechnicianCategoryBreakdown>;
}
