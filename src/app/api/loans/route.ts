import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromRequest, requireRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  let query = "SELECT l.*, u.name as user_name FROM loans l JOIN users u ON l.user_id = u.id";
  const params: (string | number)[] = [];

  if (session.role === "helper") {
    query += " WHERE l.user_id = ?";
    params.push(session.id);
  } else if (userId) {
    query += " WHERE l.user_id = ?";
    params.push(parseInt(userId));
  }

  query += " ORDER BY l.created_at DESC";

  const loans = db.prepare(query).all(...params);
  return NextResponse.json({ loans });
}

export async function POST(request: NextRequest) {
  try {
    requireRole(request, ["employer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { user_id, amount, emi, reason } = await request.json();

  if (!user_id || !amount || !emi) {
    return NextResponse.json({ error: "user_id, amount, and emi required" }, { status: 400 });
  }

  const result = db.prepare(
    "INSERT INTO loans (user_id, amount, balance, emi, reason) VALUES (?, ?, ?, ?, ?)"
  ).run(user_id, amount, amount, emi, reason || null);

  // Log disbursement
  db.prepare(
    "INSERT INTO loan_transactions (loan_id, type, amount, balance_after, note) VALUES (?, 'disbursement', ?, ?, ?)"
  ).run(result.lastInsertRowid, amount, amount, `Loan disbursed: ${reason || "Loan"}`);

  const loan = db.prepare("SELECT l.*, u.name as user_name FROM loans l JOIN users u ON l.user_id = u.id WHERE l.id = ?").get(result.lastInsertRowid);

  return NextResponse.json({ loan }, { status: 201 });
}
