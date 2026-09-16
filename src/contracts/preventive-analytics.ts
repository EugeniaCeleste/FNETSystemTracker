import type { PendingVisit } from "./pending";
import type { TaskStatus } from "./enums";

export interface PreventiveAnalyticsRow {
  id: string;
  code: string;
  description: string;
  rawStatus: string | null;
  status: TaskStatus;
  project: string | null;
  siteCode: string | null;
  siteName: string | null;
  template: string | null;
  plannedAt: string | null;
  createdAt: string | null;
  requestedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  requestedBy: string | null;
  responsible: string | null;
  collaborator: string | null;
  contractor: string | null;
  supplierResponsibles: string | null;
  link: string | null;
}

export interface PreventiveSiteSummary {
  siteCode: string;
  siteName: string | null;
  total: number;
  approved: number;
  pending: number;
  complete: boolean;
  forms: PreventiveAnalyticsRow[];
  previousVisitPending: PendingVisit[];
}

export interface PreventiveProjectStatusSummary {
  project: string;
  status: TaskStatus;
  count: number;
}

export interface PreventiveAnalyticsData {
  source: "postgresql";
  items: PreventiveAnalyticsRow[];
  sites: PreventiveSiteSummary[];
  projectStatuses: PreventiveProjectStatusSummary[];
}
