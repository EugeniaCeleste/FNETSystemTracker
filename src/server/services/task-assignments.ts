import type { InternalTaskAssignment, InternalTaskAssignmentInput, InternalTaskType, InternalTechnicianOption } from "@/contracts";
import { validateCrewPair } from "@/lib/task-assignment-rules";
import { mockTechnicians } from "@/mocks";
import { getPrismaClient } from "@/server/prisma";

const allowedActors = new Set(["DEMO_COORDINATOR", "DEMO_ADMIN"]);

export const internalTechnicianOptions: InternalTechnicianOption[] = mockTechnicians
  .filter((technician) => technician.active)
  .map((technician) => ({ id: technician.id, name: technician.name, active: technician.active }));

type AssignmentRow = {
  id: bigint;
  task_type: string;
  task_code: string;
  technician_primary: string;
  technician_collaborator: string;
  assigned_at: Date;
  assigned_by: string;
  updated_at: Date;
  active: boolean;
};

function isMissingAssignmentsTable(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2021");
}

function assignmentKey(taskType: InternalTaskType, taskCode: string): string {
  return `${taskType}:${taskCode}`;
}

function mapAssignment(row: AssignmentRow): InternalTaskAssignment {
  return {
    id: row.id.toString(),
    taskType: row.task_type as InternalTaskType,
    taskCode: row.task_code,
    technicianPrimary: row.technician_primary,
    technicianCollaborator: row.technician_collaborator,
    assignedAt: row.assigned_at.toISOString(),
    assignedBy: row.assigned_by,
    updatedAt: row.updated_at.toISOString(),
    active: row.active,
  };
}

function technicianName(id: string): string {
  const technician = internalTechnicianOptions.find((option) => option.id === id);
  if (!technician) throw new Error("UNKNOWN_TECHNICIAN");
  return technician.name;
}

function assertInput(input: InternalTaskAssignmentInput): { primary: string; collaborator: string } {
  if (input.taskType !== "CORRECTIVO" && input.taskType !== "PREVENTIVO") throw new Error("INVALID_TASK_TYPE");
  if (!input.taskCode.trim()) throw new Error("INVALID_TASK_CODE");
  if (!allowedActors.has(input.actor)) throw new Error("UNAUTHORIZED_ASSIGNMENT_ACTOR");
  const primary = technicianName(input.technicianPrimary);
  const collaborator = technicianName(input.technicianCollaborator);
  const pair = validateCrewPair(primary, collaborator);
  if (!pair) throw new Error("DUPLICATE_TECHNICIANS");
  return { primary: pair.primary, collaborator: pair.collaborator };
}

async function taskExists(taskType: InternalTaskType, taskCode: string): Promise<boolean> {
  const prisma = getPrismaClient();
  const result = taskType === "CORRECTIVO"
    ? await prisma.correctivos.findUnique({ where: { codigo: taskCode }, select: { codigo: true } })
    : await prisma.preventivos.findUnique({ where: { codigo: taskCode }, select: { codigo: true } });
  return Boolean(result);
}

export function assignmentMapKey(taskType: InternalTaskType, taskCode: string): string {
  return assignmentKey(taskType, taskCode);
}

export async function listActiveTaskAssignments(): Promise<Map<string, InternalTaskAssignment>> {
  const prisma = getPrismaClient();
  try {
    const rows = await prisma.task_assignments.findMany({ where: { active: true }, orderBy: { updated_at: "desc" } });
    return new Map(rows.map((row) => [assignmentKey(row.task_type as InternalTaskType, row.task_code), mapAssignment(row)]));
  } catch (error) {
    if (isMissingAssignmentsTable(error)) return new Map();
    throw error;
  }
}

export async function getTaskAssignment(taskType: InternalTaskType, taskCode: string): Promise<InternalTaskAssignment | null> {
  const prisma = getPrismaClient();
  try {
    const row = await prisma.task_assignments.findUnique({ where: { task_type_task_code: { task_type: taskType, task_code: taskCode } } });
    return row?.active ? mapAssignment(row) : null;
  } catch (error) {
    if (isMissingAssignmentsTable(error)) return null;
    throw error;
  }
}

export async function saveTaskAssignment(input: InternalTaskAssignmentInput): Promise<InternalTaskAssignment> {
  const { primary, collaborator } = assertInput(input);
  if (!(await taskExists(input.taskType, input.taskCode))) throw new Error("TASK_NOT_FOUND");
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction) => {
      const current = await transaction.task_assignments.findUnique({ where: { task_type_task_code: { task_type: input.taskType, task_code: input.taskCode } } });
      const changed = !current || current.technician_primary !== primary || current.technician_collaborator !== collaborator || !current.active;
      if (changed) {
        await transaction.task_assignment_history.create({
          data: {
            task_type: input.taskType,
            task_code: input.taskCode,
            previous_technician_primary: current?.technician_primary ?? null,
            previous_technician_collaborator: current?.technician_collaborator ?? null,
            new_technician_primary: primary,
            new_technician_collaborator: collaborator,
            changed_by: input.actor,
          },
        });
      }
      const row = await transaction.task_assignments.upsert({
        where: { task_type_task_code: { task_type: input.taskType, task_code: input.taskCode } },
        create: {
          task_type: input.taskType,
          task_code: input.taskCode,
          technician_primary: primary,
          technician_collaborator: collaborator,
          assigned_by: input.actor,
          active: true,
        },
        update: {
          technician_primary: primary,
          technician_collaborator: collaborator,
          assigned_by: input.actor,
          active: true,
        },
      });
      return mapAssignment(row);
    });
  } catch (error) {
    if (isMissingAssignmentsTable(error)) throw new Error("ASSIGNMENTS_TABLE_NOT_READY");
    throw error;
  }
}
