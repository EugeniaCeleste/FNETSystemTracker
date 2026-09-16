-- FNET-owned tables only. No Sytex/n8n table is altered.
CREATE TABLE IF NOT EXISTS "task_assignments" (
  "id" BIGSERIAL PRIMARY KEY,
  "task_type" TEXT NOT NULL CHECK ("task_type" IN ('CORRECTIVO', 'PREVENTIVO')),
  "task_code" TEXT NOT NULL,
  "technician_primary" TEXT NOT NULL,
  "technician_collaborator" TEXT NOT NULL,
  "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assigned_by" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "ck_fnet_task_assignment_different_technicians"
    CHECK ("technician_primary" <> "technician_collaborator"),
  CONSTRAINT "uq_fnet_task_assignment_task"
    UNIQUE ("task_type", "task_code")
);

CREATE INDEX IF NOT EXISTS "idx_fnet_task_assignment_active"
  ON "task_assignments" ("task_type", "active");

CREATE TABLE IF NOT EXISTS "task_assignment_history" (
  "id" BIGSERIAL PRIMARY KEY,
  "task_type" TEXT NOT NULL CHECK ("task_type" IN ('CORRECTIVO', 'PREVENTIVO')),
  "task_code" TEXT NOT NULL,
  "previous_technician_primary" TEXT,
  "previous_technician_collaborator" TEXT,
  "new_technician_primary" TEXT NOT NULL,
  "new_technician_collaborator" TEXT NOT NULL,
  "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "changed_by" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_fnet_task_assignment_history_task"
  ON "task_assignment_history" ("task_type", "task_code", "changed_at");
