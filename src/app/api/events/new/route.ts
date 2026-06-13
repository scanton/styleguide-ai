// This route is no longer used — events are synced from Discord via the hourly
// cron job at /api/cron/sync-discord. Kept as a 404 stub to avoid broken imports.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Deprecated — use cron sync" }, { status: 410 });
}
