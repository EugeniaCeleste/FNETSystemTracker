import { TaskStatus } from "@/contracts/enums";

export type WorkType = "AA" | "GE" | "ALTURA" | "COTA_0" | "OTROS";
export type AgeBucket = "0_7" | "8_14" | "15_21" | "OVER_21" | "NO_DATA";

export const workTypeLabels: Record<WorkType, string> = {
  AA: "AA",
  GE: "GE",
  ALTURA: "Altura",
  COTA_0: "Cota 0",
  OTROS: "Otros",
};

export function classifyWorkType(values: Array<string | null | undefined>): WorkType {
  const text = values.filter(Boolean).join(" ").toUpperCase();
  if (/\bCOTA\s*0\b|\bCOTA0\b/.test(text)) return "COTA_0";
  if (/\bALTURA\b|\bTRABAJO\s+EN\s+ALTURA\b/.test(text)) return "ALTURA";
  if (/\bGE\b|GRUPO\s+ELECTR[ÓO]GENO|GENERADOR/.test(text)) return "GE";
  if (/\bAA\b|AIRE\s+ACONDICIONADO|CLIMATIZ/.test(text)) return "AA";
  return "OTROS";
}

export function isTerminalCorrectiveStatus(status: TaskStatus): boolean {
  return status === TaskStatus.APPROVED || status === TaskStatus.APPROVED_WITH_PENDING || status === TaskStatus.CANCELLED;
}

export function isActiveCorrectiveStatus(status: TaskStatus): boolean {
  return !isTerminalCorrectiveStatus(status);
}

export function ageDaysFrom(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((now - timestamp) / 86_400_000));
}

export function ageBucketFrom(days: number | null): AgeBucket {
  if (days === null) return "NO_DATA";
  if (days <= 7) return "0_7";
  if (days <= 14) return "8_14";
  if (days <= 21) return "15_21";
  return "OVER_21";
}
