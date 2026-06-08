import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const granularity = searchParams.get("granularity") || "day";

  if (!from || !to) {
    return NextResponse.json({ error: "from and to parameters required" }, { status: 400 });
  }

  let dateFormat: string;
  switch (granularity) {
    case "week":
      dateFormat = "%Y-W%W";
      break;
    case "month":
      dateFormat = "%Y-%m";
      break;
    default:
      dateFormat = "%Y-%m-%d";
  }

  const periodData = db
    .prepare(
      `SELECT
        strftime('${dateFormat}', date) as period,
        type,
        COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE date >= ? AND date <= ?
       GROUP BY period, type
       ORDER BY period`
    )
    .all(from, to) as { period: string; type: string; total: number }[];

  const categoryData = db
    .prepare(
      `SELECT
        strftime('${dateFormat}', t.date) as period,
        c.name as category,
        c.color,
        COALESCE(SUM(t.amount), 0) as amount
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.date >= ? AND t.date <= ? AND t.type = 'expense'
       GROUP BY period, c.name
       ORDER BY period`
    )
    .all(from, to) as { period: string; category: string; color: string; amount: number }[];

  const periodsMap = new Map<string, { total_expense: number; total_income: number; by_category: { category: string; color: string; amount: number }[] }>();

  for (const row of periodData) {
    if (!periodsMap.has(row.period)) {
      periodsMap.set(row.period, { total_expense: 0, total_income: 0, by_category: [] });
    }
    const entry = periodsMap.get(row.period)!;
    if (row.type === "income") entry.total_income = row.total;
    if (row.type === "expense") entry.total_expense = row.total;
  }

  for (const row of categoryData) {
    if (!periodsMap.has(row.period)) {
      periodsMap.set(row.period, { total_expense: 0, total_income: 0, by_category: [] });
    }
    periodsMap.get(row.period)!.by_category.push({
      category: row.category || "Uncategorized",
      color: row.color || "#6B7280",
      amount: row.amount,
    });
  }

  const data = Array.from(periodsMap.entries()).map(([period, val]) => ({
    period,
    ...val,
  }));

  const summary = db
    .prepare(
      `SELECT
        (SELECT c.name FROM transactions t2 JOIN categories c ON t2.category_id = c.id
         WHERE t2.date >= ? AND t2.date <= ? AND t2.type = 'expense'
         GROUP BY c.name ORDER BY SUM(t2.amount) DESC LIMIT 1) as top_category,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as total_spend,
        COUNT(DISTINCT date) as days_with_data
       FROM transactions
       WHERE date >= ? AND date <= ?`
    )
    .get(from, to, from, to) as { top_category: string | null; total_spend: number; days_with_data: number };

  return NextResponse.json({
    data,
    summary: {
      top_category: summary.top_category || "N/A",
      total_spend: summary.total_spend,
      avg_daily_spend: summary.days_with_data > 0 ? summary.total_spend / summary.days_with_data : 0,
    },
  });
}
