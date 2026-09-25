import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { databaseUserToContract, SESSION_COOKIE, verifySessionToken } from "@/server/auth";
import { canAccessGlobalData } from "@/server/access";
import { getPrismaClient } from "@/server/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const claims = await verifySessionToken(token);
  if (!claims) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });

  try {
    const row = await getPrismaClient().app_users.findUnique({ where: { id: claims.sub } });
    if (!row?.active) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });
    const user = databaseUserToContract(row);
    if (!canAccessGlobalData(user.role)) return NextResponse.json({ code: "ROLE_SCOPE_NOT_READY" }, { status: 403 });
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ code: "AUTH_UNAVAILABLE" }, { status: 503 });
  }
}
