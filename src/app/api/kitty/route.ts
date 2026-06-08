import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const rows = db
    .prepare(
      `SELECT type, COALESCE(SUM(amount), 0) as total FROM transactions GROUP BY type`
    )
    .all() as { type: string; total: number }[];

  let total_income = 0;
  let total_expense = 0;
  for (const row of rows) {
    if (row.type === "income") total_income = row.total;
    if (row.type === "expense") total_expense = row.total;
  }

  return NextResponse.json({
    balance: total_income - total_expense,
    total_income,
    total_expense,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { amount, description, helper_name, date } = body;

  if (!amount || amount <= 0 || !helper_name || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO transactions (id, type, amount, description, helper_name, date)
     VALUES (?, 'income', ?, ?, ?, ?)`
  ).run(id, amount, description || null, helper_name, date);

  const transaction = db
    .prepare(`SELECT * FROM transactions WHERE id = ?`)
    .get(id);

  const balance = db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0) as balance FROM transactions`
    )
    .get() as { balance: number };

  return NextResponse.json({ transaction, new_balance: balance.balance }, { status: 201 });
}
