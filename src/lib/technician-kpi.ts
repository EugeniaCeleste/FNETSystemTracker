import type { TechnicianCategoryBreakdown, TechnicianCrewRankingRow, TechnicianKpiWorkItem, TechnicianRankingRow, TechnicianScoreCategory } from "@/contracts";
import { TECHNICIAN_SCORE_CATEGORIES, crewKeyForMembers, isProductivityCompleted, isProductivityPending, normalizeCrewMembers } from "./technician-scoring";

function emptyBreakdown(): Record<TechnicianScoreCategory, TechnicianCategoryBreakdown> {
  return Object.fromEntries(TECHNICIAN_SCORE_CATEGORIES.map((category) => [category, { count: 0, approved: 0, points: 0 }])) as Record<TechnicianScoreCategory, TechnicianCategoryBreakdown>;
}

function dateKey(value: string | null): string | null {
  return value?.slice(0, 10) || null;
}

export function buildTechnicianRanking(items: TechnicianKpiWorkItem[]): TechnicianRankingRow[] {
  const byTechnician = new Map<string, TechnicianRankingRow & { days: Set<string>; zones: Set<string> }>();
  for (const item of items) {
    if (!item.validForScoring) continue;
    for (const technician of [...new Set(item.assignments)]) {
      if (!technician) continue;
      const current = byTechnician.get(technician) ?? {
        technician,
        zone: null,
        points: 0,
        tasks: 0,
        preventives: 0,
        correctives: 0,
        approved: 0,
        rejected: 0,
        rejections: 0,
        pending: 0,
        compliance: 0,
        averagePointsPerDay: 0,
        breakdown: emptyBreakdown(),
        days: new Set<string>(),
        zones: new Set<string>(),
      };
      current.tasks += 1;
      current.points += item.points;
      if (item.kind === "PREVENTIVE") current.preventives += 1;
      else current.correctives += 1;
      if (item.status === "APPROVED") current.approved += 1;
      if (item.status === "REJECTED") current.rejected += 1;
      current.rejections += item.rejectionCount;
      if (isProductivityPending(item.status)) current.pending += 1;
      const key = dateKey(item.plannedAt);
      if (key) current.days.add(key);
      if (item.zone) current.zones.add(item.zone);
      current.breakdown[item.category].count += 1;
      if (isProductivityCompleted(item.status)) current.breakdown[item.category].approved += 1;
      current.breakdown[item.category].points += item.points;
      byTechnician.set(technician, current);
    }
  }
  return [...byTechnician.values()].map(({ days, zones, ...row }) => ({
    ...row,
    zone: zones.size === 1 ? [...zones][0] : zones.size > 1 ? [...zones].sort().join(" · ") : null,
    compliance: row.tasks === 0 ? 0 : Math.round((row.approved / row.tasks) * 100),
    averagePointsPerDay: days.size === 0 ? 0 : Number((row.points / days.size).toFixed(2)),
  })).sort((left, right) => right.points - left.points || right.tasks - left.tasks || left.technician.localeCompare(right.technician));
}

export function itemsForTechnician(items: TechnicianKpiWorkItem[], technician: string): TechnicianKpiWorkItem[] {
  return items.filter((item) => item.validForScoring && item.assignments.includes(technician));
}

function durationDays(item: TechnicianKpiWorkItem): number | null {
  if (!item.originAt || !item.completedAt) return null;
  const duration = (new Date(item.completedAt).getTime() - new Date(item.originAt).getTime()) / 86_400_000;
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

export function buildCrewRanking(items: TechnicianKpiWorkItem[]): TechnicianCrewRankingRow[] {
  const byCrew = new Map<string, TechnicianCrewRankingRow & { days: Set<string>; durationTotal: number; durationCount: number }>();
  for (const item of items) {
    if (!item.validForScoring) continue;
    const members = normalizeCrewMembers(item.crewMembers);
    const crewKey = crewKeyForMembers(members);
    if (!crewKey) continue;
    const current = byCrew.get(crewKey) ?? {
      crewKey,
      crewLabel: members.join(" + "),
      members,
      points: 0,
      tasks: 0,
      preventives: 0,
      correctives: 0,
      approved: 0,
      approvedWithPending: 0,
      rejected: 0,
      rejections: 0,
      pending: 0,
      compliance: 0,
      averagePointsPerDay: 0,
      averageTaskDurationDays: null,
      breakdown: emptyBreakdown(),
      days: new Set<string>(),
      durationTotal: 0,
      durationCount: 0,
    };
    current.tasks += 1;
    current.points += item.points;
    if (item.kind === "PREVENTIVE") current.preventives += 1;
    else current.correctives += 1;
    if (item.status === "APPROVED") current.approved += 1;
    if (item.status === "APPROVED_WITH_PENDING") current.approvedWithPending += 1;
    if (item.status === "REJECTED") current.rejected += 1;
    current.rejections += item.rejectionCount;
    if (isProductivityPending(item.status)) current.pending += 1;
    const key = dateKey(item.plannedAt);
    if (key) current.days.add(key);
    const duration = durationDays(item);
    if (duration !== null) {
      current.durationTotal += duration;
      current.durationCount += 1;
    }
    current.breakdown[item.category].count += 1;
    if (isProductivityCompleted(item.status)) current.breakdown[item.category].approved += 1;
    current.breakdown[item.category].points += item.points;
    byCrew.set(crewKey, current);
  }
  return [...byCrew.values()].map(({ days, durationTotal, durationCount, ...row }) => ({
    ...row,
    compliance: row.tasks === 0 ? 0 : Math.round(((row.approved + row.approvedWithPending) / row.tasks) * 100),
    averagePointsPerDay: days.size === 0 ? 0 : Number((row.points / days.size).toFixed(2)),
    averageTaskDurationDays: durationCount === 0 ? null : Number((durationTotal / durationCount).toFixed(2)),
  })).sort((left, right) => right.points - left.points || right.tasks - left.tasks || left.crewLabel.localeCompare(right.crewLabel));
}

export function itemsForCrew(items: TechnicianKpiWorkItem[], crewKey: string): TechnicianKpiWorkItem[] {
  return items.filter((item) => item.validForScoring && crewKeyForMembers(item.crewMembers) === crewKey);
}
