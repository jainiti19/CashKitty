import { NextRequest, NextResponse } from "next/server";
import { runAllDetectors } from "@/lib/fraud-detector";
import db from "@/lib/db";

export async function GET() {
  const alerts = runAllDetectors();

  return NextResponse.json({
    alerts,
    summary: {
      total: alerts.length,
      high: alerts.filter((a) => a.severity === "high").length,
      medium: alerts.filter((a) => a.severity === "medium").length,
      low: alerts.filter((a) => a.severity === "low").length,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const { id, resolved } = await request.json();
  db.prepare("UPDATE alerts SET resolved = ? WHERE id = ?").run(resolved ? 1 : 0, id);
  return NextResponse.json({ success: true });
}
