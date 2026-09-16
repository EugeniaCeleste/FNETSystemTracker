import { NextResponse } from "next/server";
import { getCorrectiveDiagnosticDetail } from "@/server/services/corrective-diagnostic-detail";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  try {
    return NextResponse.json(await getCorrectiveDiagnosticDetail());
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
}
