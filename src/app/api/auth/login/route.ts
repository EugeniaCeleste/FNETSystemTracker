import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, databaseUserToContract, SESSION_COOKIE, SESSION_SECONDS } from "@/server/auth";
import { canAccessGlobalData } from "@/server/access";
import { getPrismaClient } from "@/server/prisma";
import { ensureBootstrapAdmin } from "@/server/services/auth-schema";

export const dynamic = "force-dynamic";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ code: "INVALID_CREDENTIALS" }, { status: 400 });

  try {
    await ensureBootstrapAdmin();
    const row = await getPrismaClient().app_users.findUnique({ where: { email: parsed.data.email } });
    if (!row || !row.active || !(await compare(parsed.data.password, row.passwordHash))) {
      return NextResponse.json({ code: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    const user = databaseUserToContract(row);
    if (!canAccessGlobalData(user.role)) {
      return NextResponse.json({ code: "ROLE_SCOPE_NOT_READY" }, { status: 403 });
    }
    const response = NextResponse.json({ user, expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000).toISOString() });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: await createSessionToken(user),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    const code = error instanceof Error ? error.message : "AUTH_UNAVAILABLE";
    if (code === "BOOTSTRAP_ADMIN_NOT_CONFIGURED" || code === "BOOTSTRAP_ADMIN_EMAIL_ALREADY_IN_USE" || code === "AUTH_SECRET_NOT_CONFIGURED") {
      return NextResponse.json({ code }, { status: 503 });
    }
    return NextResponse.json({ code: "AUTH_UNAVAILABLE" }, { status: 503 });
  }
}
