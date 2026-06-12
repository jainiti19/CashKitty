import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const transactions = db.prepare(
    "SELECT * FROM loan_transactions WHERE loan_id = ? ORDER BY date DESC, created_at DESC"
  ).all(parseInt(id));

  return NextResponse.json({ transactions });
}
