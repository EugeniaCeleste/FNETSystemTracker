import { describe, expect, it } from "vitest";
import { TaskStatus } from "@/contracts";
import { taskStatus } from "./synced-data";

describe("task status normalization", () => {
  it.each([
    ["OPEN", TaskStatus.OPEN],
    ["IN_PROGRESS", TaskStatus.IN_PROGRESS],
    ["EN PROCESO", TaskStatus.IN_PROGRESS],
    ["IN_REVIEW", TaskStatus.IN_REVIEW],
    ["SENT", TaskStatus.SENT],
    ["REJECTED", TaskStatus.REJECTED],
    ["CANCELLED", TaskStatus.CANCELLED],
    ["APPROVED", TaskStatus.APPROVED],
    ["APPROVED_WITH_PENDING", TaskStatus.APPROVED_WITH_PENDING],
    ["APROBADO CON PENDIENTES", TaskStatus.APPROVED_WITH_PENDING],
  ])("maps %s to the canonical task state", (raw, expected) => {
    expect(taskStatus(raw)).toBe(expected);
  });
});
