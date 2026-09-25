import { createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/server/prisma";

const WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_IP_LIMIT = 30;
export const LOGIN_ACCOUNT_LIMIT = 10;

export function makeLoginRateLimitKey(scope: "ip" | "account", value: string): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) throw new Error("AUTH_SECRET_NOT_CONFIGURED");
  return createHmac("sha256", secret).update(`${scope}:${value}`).digest("hex");
}

export function isLoginRateLimited(
  attemptCount: number,
  windowStartedAt: Date,
  maximum: number,
  now = new Date(),
): boolean {
  return attemptCount >= maximum && now.getTime() - windowStartedAt.getTime() < WINDOW_MS;
}

export async function getLoginRateLimit(
  keys: Array<{ key: string; maximum: number }>,
): Promise<{ limited: boolean; retryAfterSeconds: number }> {
  const prisma = getPrismaClient();
  const now = new Date();
  const states = await Promise.all(keys.map(async ({ key, maximum }) => {
    const rows = await prisma.$queryRaw<Array<{ attempt_count: number; window_started_at: Date }>>(Prisma.sql`
      SELECT "attempt_count", "window_started_at"
      FROM "app_login_attempts"
      WHERE "key_hash" = ${key}
    `);
    const state = rows[0];
    if (!state || !isLoginRateLimited(state.attempt_count, state.window_started_at, maximum, now)) return 0;
    return Math.max(1, Math.ceil((state.window_started_at.getTime() + WINDOW_MS - now.getTime()) / 1000));
  }));
  const retryAfterSeconds = Math.max(0, ...states);
  return { limited: retryAfterSeconds > 0, retryAfterSeconds };
}

export async function recordFailedLogin(keys: string[]): Promise<void> {
  const prisma = getPrismaClient();
  await Promise.all(keys.map((key) => prisma.$executeRaw(Prisma.sql`
    INSERT INTO "app_login_attempts" ("key_hash", "attempt_count", "window_started_at")
    VALUES (${key}, 1, NOW())
    ON CONFLICT ("key_hash") DO UPDATE SET
      "attempt_count" = CASE
        WHEN "app_login_attempts"."window_started_at" <= NOW() - INTERVAL '15 minutes' THEN 1
        ELSE "app_login_attempts"."attempt_count" + 1
      END,
      "window_started_at" = CASE
        WHEN "app_login_attempts"."window_started_at" <= NOW() - INTERVAL '15 minutes' THEN NOW()
        ELSE "app_login_attempts"."window_started_at"
      END
  `)));
  if (Math.random() < 0.01) {
    await prisma.app_login_attempts.deleteMany({ where: { windowStartedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
  }
}

export async function clearLoginRateLimit(key: string): Promise<void> {
  await getPrismaClient().app_login_attempts.deleteMany({ where: { keyHash: key } });
}
