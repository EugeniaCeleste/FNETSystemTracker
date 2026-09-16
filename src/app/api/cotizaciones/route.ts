import { NextResponse } from "next/server";
import { databaseIsConfigured } from "@/server/services/database-availability";
import { getSyncedData } from "@/server/services/synced-data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!databaseIsConfigured()) return NextResponse.json({ code: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  try { const data = await getSyncedData(); return NextResponse.json({ source: data.source, count: data.counts.cotizaciones, items: data.quotes }, { headers: { "Cache-Control": "no-store" } }); } catch { return NextResponse.json({ code: "DATABASE_UNAVAILABLE" }, { status: 503 }); }
}
