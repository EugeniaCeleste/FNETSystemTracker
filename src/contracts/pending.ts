export type PendingStatus = "PENDIENTE" | "RESUELTO" | "DESCARTADO" | string;

export interface PendingVisit {
  id: string;
  formulario: string;
  source: string;
  sourceKey: string;
  siteCode: string | null;
  siteName: string | null;
  networkElement: string | null;
  status: string | null;
  group: string | null;
  index: string | null;
  question: string | null;
  answer: string | null;
  comments: string | null;
  possiblePending: boolean | null;
  editedAt: string | null;
  editedBy: string | null;
  pendingStatus: PendingStatus;
  syncedAt: string | null;
}

export interface PendingMetrics {
  total: number;
  open: number;
  bySource: Record<string, number>;
  bySite: Record<string, number>;
}
