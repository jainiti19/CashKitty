import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRole(request, ["employer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { emi, status } = await request.json();

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (emi !== undefined) { fields.push("emi = ?"); values.push(emi); }
  if (status !== undefined) { fields.push("status = ?"); values.push(status); }

  if (fields.length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });

  values.push(parseInt(id));
  db.prepare(`UPDATE loans SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  const loan = db.prepare("SELECT l.*, u.name as user_name FROM loans l JOIN users u ON l.user_id = u.id WHERE l.id = ?").get(parseInt(id));
  return NextResponse.json({ loan });
}

// POST: Ad-hoc repayment
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
  const { amount } = await request.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  const loan = db.prepare("SELECT * FROM loans WHERE id = ?").get(parseInt(id)) as { id: number; balance: number } | undefined;
  if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  if (loan.balance <= 0) return NextResponse.json({ error: "Loan already paid off" }, { status: 400 });

  const repayment = Math.min(amount, loan.balance);
  const newBalance = Math.max(0, loan.balance - repayment);

  db.prepare("UPDATE loans SET balance = ?, status = ? WHERE id = ?")
    .run(newBalance, newBalance <= 0 ? "paid_off" : "active", parseInt(id));

  // Log ad-hoc repayment
  db.prepare(
    "INSERT INTO loan_transactions (loan_id, type, amount, balance_after, note) VALUES (?, 'adhoc_repayment', ?, ?, 'Ad-hoc repayment')"
  ).run(parseInt(id), repayment, newBalance);

  const updated = db.prepare("SELECT l.*, u.name as user_name FROM loans l JOIN users u ON l.user_id = u.id WHERE l.id = ?").get(parseInt(id));
  return NextResponse.json({ loan: updated, repaid: repayment, new_balance: newBalance });
}
