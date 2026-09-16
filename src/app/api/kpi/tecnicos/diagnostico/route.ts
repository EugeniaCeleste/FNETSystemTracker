import { NextResponse } from "next/server";
import { getTechnicianDiagnostic } from "@/server/services/technician-diagnostic";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getTechnicianDiagnostic());
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
}
