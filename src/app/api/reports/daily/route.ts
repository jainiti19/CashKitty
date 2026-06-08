import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import type { Transaction } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Date parameter required (YYYY-MM-DD)" }, { status: 400 });
  }

  const transactions = db
    .prepare(
      `SELECT t.*, c.name as category_name, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.date = ?
       ORDER BY t.created_at DESC`
    )
    .all(date) as Transaction[];

  let total_income = 0;
  let total_expense = 0;
  for (const t of transactions) {
    if (t.type === "income") total_income += t.amount;
    else total_expense += t.amount;
  }

  return NextResponse.json({
    date,
    total_income,
    total_expense,
    net: total_income - total_expense,
    transactions,
  });
}
