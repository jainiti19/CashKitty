import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    requireRole(request, ["employer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { user_id, month, other_deduction, bonus, notes } = await request.json();

  if (!user_id || !month) {
    return NextResponse.json({ error: "user_id and month required" }, { status: 400 });
  }

  // Get user's salary
  const user = db.prepare("SELECT id, name, salary FROM users WHERE id = ? AND active = 1").get(user_id) as { id: number; name: string; salary: number | null } | undefined;
  if (!user || !user.salary) {
    return NextResponse.json({ error: "User not found or no salary set" }, { status: 400 });
  }

  // Check if already generated for this month
  const existing = db.prepare("SELECT id FROM salary_payments WHERE user_id = ? AND month = ?").get(user_id, month);
  if (existing) {
    return NextResponse.json({ error: "Salary already generated for this month" }, { status: 409 });
  }

  // Calculate loan deduction from active loans
  const activeLoans = db.prepare("SELECT SUM(emi) as total_emi FROM loans WHERE user_id = ? AND status = 'active'").get(user_id) as { total_emi: number | null };
  const loanDeduction = activeLoans.total_emi || 0;
  const otherDed = other_deduction || 0;
  const bonusAmt = bonus || 0;

  const netPaid = user.salary - loanDeduction - otherDed + bonusAmt;

  const result = db.prepare(
    `INSERT INTO salary_payments (user_id, month, base_salary, loan_deduction, other_deduction, bonus, net_paid, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(user_id, month, user.salary, loanDeduction, otherDed, bonusAmt, netPaid, notes || null);

  const payment = db.prepare("SELECT sp.*, u.name as user_name FROM salary_payments sp JOIN users u ON sp.user_id = u.id WHERE sp.id = ?").get(result.lastInsertRowid);

  return NextResponse.json({ payment }, { status: 201 });
}
