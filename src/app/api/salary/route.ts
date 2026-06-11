import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  let query = `SELECT sp.*, u.name as user_name FROM salary_payments sp JOIN users u ON sp.user_id = u.id`;
  const params: (string | number)[] = [];

  if (session.role === "helper") {
    query += " WHERE sp.user_id = ?";
    params.push(session.id);
  } else if (userId) {
    query += " WHERE sp.user_id = ?";
    params.push(parseInt(userId));
  }

  query += " ORDER BY sp.month DESC, sp.created_at DESC";

  const payments = db.prepare(query).all(...params);
  return NextResponse.json({ payments });
}
