import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const result = db
    .prepare("SELECT COUNT(*) as count FROM alerts WHERE resolved = 0")
    .get() as { count: number };
  return NextResponse.json({ count: result.count });
}
