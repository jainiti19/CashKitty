import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRole(request, ["employer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const payment = db.prepare("SELECT * FROM salary_payments WHERE id = ?").get(parseInt(id)) as Record<string, unknown> | undefined;

  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (payment.status === "paid") return NextResponse.json({ error: "Already paid" }, { status: 400 });

  const today = new Date().toISOString().split("T")[0];

  // Mark as paid
  db.prepare("UPDATE salary_payments SET status = 'paid', paid_date = ? WHERE id = ?").run(today, parseInt(id));

  // Reduce loan balances
  if ((payment.loan_deduction as number) > 0) {
    const loans = db.prepare("SELECT id, balance, emi FROM loans WHERE user_id = ? AND status = 'active' ORDER BY id").all(payment.user_id) as { id: number; balance: number; emi: number }[];

    for (const loan of loans) {
      const deduction = Math.min(loan.emi, loan.balance);
      const newBalance = Math.max(0, loan.balance - deduction);
      db.prepare("UPDATE loans SET balance = ?, status = ? WHERE id = ?").run(
        newBalance, newBalance <= 0 ? "paid_off" : "active", loan.id
      );
      // Log EMI deduction
      db.prepare(
        "INSERT INTO loan_transactions (loan_id, type, amount, balance_after, note, date) VALUES (?, 'emi', ?, ?, ?, ?)"
      ).run(loan.id, deduction, newBalance, `EMI deduction from ${payment.month} salary`, today);
    }
  }

  return NextResponse.json({ success: true });
}
