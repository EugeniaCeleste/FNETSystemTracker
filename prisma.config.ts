import { defineConfig, env } from "prisma/config";

// Prisma CLI does not load Next.js's .env.local convention automatically.
// Keep this explicit and server-side so DATABASE_URL never enters the client.
const nodeProcess = process as NodeJS.Process & { loadEnvFile?: (path?: string) => void };
nodeProcess.loadEnvFile?.(".env.local");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
