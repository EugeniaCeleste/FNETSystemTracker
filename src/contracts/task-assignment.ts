export type InternalTaskType = "CORRECTIVO" | "PREVENTIVO";

export interface InternalTechnicianOption {
  id: string;
  name: string;
  active: boolean;
}

export interface InternalTaskAssignment {
  id: string;
  taskType: InternalTaskType;
  taskCode: string;
  technicianPrimary: string;
  technicianCollaborator: string;
  assignedAt: string;
  assignedBy: string;
  updatedAt: string;
  active: boolean;
}

export interface InternalTaskAssignmentInput {
  taskType: InternalTaskType;
  taskCode: string;
  technicianPrimary: string;
  technicianCollaborator: string;
  actor: "DEMO_COORDINATOR" | "DEMO_ADMIN";
}

export interface InternalTaskAssignmentResponse {
  source: "fnet";
  assignment: InternalTaskAssignment | null;
  technicians: InternalTechnicianOption[];
  authorization: "DEMO_ONLY";
}
