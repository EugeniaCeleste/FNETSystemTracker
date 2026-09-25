-- FNET-owned authentication table. No Sytex/n8n table is altered.
CREATE TABLE IF NOT EXISTS "app_users" (
  "id" UUID PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL CHECK ("role" IN ('ADMIN', 'COORDINATOR', 'MANAGER', 'TECHNICIAN')),
  "technician_id" TEXT,
  "coordinator_id" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_app_users_role_active"
  ON "app_users" ("role", "active");
