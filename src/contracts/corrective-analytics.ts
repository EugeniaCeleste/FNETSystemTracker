import type { PendingVisit } from "./pending";
import type { PostgresQuote } from "./synced-data";
import type { InternalTaskAssignment } from "./task-assignment";
import type { TaskCriticality, TaskStatus } from "./enums";
import type { AgeBucket, WorkType } from "@/lib/corrective-rules";

export interface CorrectiveAnalyticsRow {
  id: string;
  code: string;
  description: string;
  rawStatus: string | null;
  status: TaskStatus;
  project: string | null;
  siteCode: string | null;
  siteName: string | null;
  template: string | null;
  originDate: string | null;
  originDateSource: "abierto_el" | "creado_el" | null;
  plannedAt: string | null;
  workType: WorkType;
  criticality: TaskCriticality;
  responsible: string | null;
  collaborator: string | null;
  contractor: string | null;
  supplierResponsibles: string | null;
  internalAssignment: InternalTaskAssignment | null;
  link: string | null;
  quotes: PostgresQuote[];
}

export interface CorrectiveAnalyticsData {
  source: "postgresql";
  items: CorrectiveAnalyticsRow[];
  pendingBySite: Record<string, PendingVisit[]>;
}

export type CorrectiveAgeBucket = AgeBucket;
