import { describe, expect, it } from "vitest";
import type { TechnicianKpiWorkItem } from "@/contracts";
import { buildCrewRanking, buildTechnicianRanking } from "./technician-kpi";

function workItem(partial: Partial<TechnicianKpiWorkItem>): TechnicianKpiWorkItem {
  return {
    id: partial.id ?? "1",
    code: partial.code ?? "FO-1",
    kind: partial.kind ?? "PREVENTIVE",
    template: partial.template ?? "ECP",
    category: partial.category ?? "ECP",
    project: null,
    zone: null,
    coordinator: null,
    plannedAt: partial.plannedAt ?? "2026-09-01T12:00:00.000Z",
    rawStatus: null,
    status: partial.status ?? "APPROVED",
    assignments: partial.assignments ?? ["ana@example.com"],
    crewMembers: partial.crewMembers ?? partial.assignments ?? ["ana@example.com"],
    crewStatus: partial.crewStatus ?? ((partial.crewMembers ?? partial.assignments ?? ["ana@example.com"]).length === 2 ? "COMPLETE" : "CUADRILLA_DATOS_INCOMPLETOS"),
    originAt: partial.originAt ?? "2026-09-01T10:00:00.000Z",
    completedAt: partial.completedAt ?? "2026-09-01T12:00:00.000Z",
    points: partial.points ?? 15,
    validForScoring: partial.validForScoring ?? true,
    rejectionCount: partial.rejectionCount ?? 0,
  };
}

describe("technician KPI aggregation", () => {
  it("calculates points and subtotals per technician", () => {
    const [row] = buildTechnicianRanking([
      workItem({ id: "1", category: "ECP", points: 15, assignments: ["ana@example.com"] }),
      workItem({ id: "2", kind: "CORRECTIVE", category: "CORRECTIVOS", points: 15, assignments: ["ana@example.com"] }),
    ]);
    expect(row.points).toBe(30);
    expect(row.tasks).toBe(2);
    expect(row.preventives).toBe(1);
    expect(row.correctives).toBe(1);
    expect(row.breakdown.ECP).toEqual({ count: 1, approved: 1, points: 15 });
    expect(row.breakdown.CORRECTIVOS).toEqual({ count: 1, approved: 1, points: 15 });
  });

  it("shows unclassified work with zero points and counts it for review", () => {
    const [row] = buildTechnicianRanking([workItem({ category: "SIN_CLASIFICAR", points: 0 })]);
    expect(row.tasks).toBe(1);
    expect(row.points).toBe(0);
    expect(row.breakdown.SIN_CLASIFICAR).toEqual({ count: 1, approved: 1, points: 0 });
  });

  it("assigns one shared work item once to each distinct crew member", () => {
    const ranking = buildTechnicianRanking([workItem({ assignments: ["ana@example.com", "ana@example.com", "bruno@example.com"], points: 5 })]);
    expect(ranking).toHaveLength(2);
    expect(ranking.find((row) => row.technician === "ana@example.com")?.tasks).toBe(1);
    expect(ranking.find((row) => row.technician === "bruno@example.com")?.tasks).toBe(1);
  });

  it("keeps non-final work in task counts without awarding points", () => {
    const [row] = buildTechnicianRanking([
      workItem({ id: "open", status: "OPEN", points: 0 }),
      workItem({ id: "progress", status: "IN_PROGRESS", points: 0 }),
      workItem({ id: "rejected", status: "REJECTED", points: 0, rejectionCount: 2 }),
      workItem({ id: "approved", status: "APPROVED", points: 15 }),
      workItem({ id: "pending", status: "APPROVED_WITH_PENDING", points: 15 }),
    ]);
    expect(row.tasks).toBe(5);
    expect(row.points).toBe(30);
    expect(row.approved).toBe(1);
    expect(row.rejected).toBe(1);
    expect(row.rejections).toBe(2);
    expect(row.pending).toBe(4);
    expect(row.breakdown.ECP).toEqual({ count: 5, approved: 2, points: 30 });
  });

  it("does not include cancelled work in the technician ranking", () => {
    expect(buildTechnicianRanking([workItem({ status: "CANCELLED", points: 0, validForScoring: false })])).toEqual([]);
  });

  it("awards the full task score to both crew members and to the crew", () => {
    const item = workItem({ assignments: ["ana@example.com", "bruno@example.com"], crewMembers: ["ana@example.com", "bruno@example.com"], points: 15 });
    const individual = buildTechnicianRanking([item]);
    const crew = buildCrewRanking([item]);
    expect(individual.find((row) => row.technician === "ana@example.com")?.points).toBe(15);
    expect(individual.find((row) => row.technician === "bruno@example.com")?.points).toBe(15);
    expect(crew[0]?.points).toBe(15);
    expect(crew[0]?.tasks).toBe(1);
  });

  it("uses one order-independent crew identity and separates partner changes", () => {
    const ranking = buildCrewRanking([
      workItem({ id: "ab-1", assignments: ["A", "B"], crewMembers: ["A", "B"], points: 15 }),
      workItem({ id: "ba-2", assignments: ["B", "A"], crewMembers: ["B", "A"], points: 15 }),
      workItem({ id: "ac-3", assignments: ["A", "C"], crewMembers: ["A", "C"], points: 15 }),
    ]);
    expect(ranking).toHaveLength(2);
    expect(ranking.find((row) => row.members.join("+") === "A+B")?.tasks).toBe(2);
    expect(ranking.find((row) => row.members.join("+") === "A+C")?.tasks).toBe(1);
  });

  it("excludes incomplete crews without inventing a second member", () => {
    const ranking = buildCrewRanking([workItem({ assignments: ["A"], crewMembers: ["A"], points: 15 })]);
    expect(ranking).toEqual([]);
  });

  it("calculates average task duration only when source dates are available", () => {
    const [row] = buildCrewRanking([workItem({ assignments: ["A", "B"], crewMembers: ["A", "B"], originAt: "2026-09-01T00:00:00.000Z", completedAt: "2026-09-03T00:00:00.000Z" })]);
    expect(row.averageTaskDurationDays).toBe(2);
  });
});
