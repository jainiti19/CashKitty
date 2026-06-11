import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET() {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  try {
    requireRole(request, ["employer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

  for (const [key, value] of Object.entries(body)) {
    stmt.run(key, String(value));
  }

  return NextResponse.json({ success: true });
}
