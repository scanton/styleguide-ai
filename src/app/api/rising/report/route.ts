import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { risingReports } from "@/drizzle/schema";
import { createHash } from "crypto";
import { sql } from "drizzle-orm";

function fingerprintRequest(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  return createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.postId || typeof body.postId !== "string") {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  const reporterId = fingerprintRequest(req);

  try {
    await db
      .insert(risingReports)
      .values({ postId: body.postId, reporterId })
      .onConflictDoNothing();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
