import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/server/auth";
import { canAccessGlobalData } from "@/server/access";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/auth/") || path === "/api/health") return NextResponse.next();

  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const claims = token ? await verifySessionToken(token) : null;
    if (!claims) {
      return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });
    }
    if (!canAccessGlobalData(claims.role)) {
      return NextResponse.json({ code: "ROLE_SCOPE_NOT_READY" }, { status: 403 });
    }
    return NextResponse.next();
  } catch {
    return NextResponse.json({ code: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
