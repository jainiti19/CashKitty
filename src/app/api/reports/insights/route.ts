import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  // Overall totals
  const overall = db.prepare(`
    SELECT type, COUNT(*) as cnt, ROUND(SUM(amount)) as total, ROUND(AVG(amount)) as avg_amt
    FROM transactions GROUP BY type
  `).all() as { type: string; cnt: number; total: number; avg_amt: number }[];

  const totalExpense = overall.find(o => o.type === "expense")?.total || 0;
  const totalIncome = overall.find(o => o.type === "income")?.total || 0;
  const txnCount = overall.find(o => o.type === "expense")?.cnt || 0;
  const avgExpense = overall.find(o => o.type === "expense")?.avg_amt || 0;

  // Monthly summary
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', date) as month,
      ROUND(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END)) as expenses,
      ROUND(SUM(CASE WHEN type='income' THEN amount ELSE 0 END)) as income
    FROM transactions GROUP BY month ORDER BY month
  `).all() as { month: string; expenses: number; income: number }[];

  // Category breakdown
  const byCategory = db.prepare(`
    SELECT c.name, c.color, COUNT(*) as cnt, ROUND(SUM(t.amount)) as total,
      ROUND(AVG(t.amount)) as avg_amt, ROUND(MAX(t.amount)) as max_amt
    FROM transactions t JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'expense'
    GROUP BY c.name ORDER BY total DESC
  `).all() as { name: string; color: string; cnt: number; total: number; avg_amt: number; max_amt: number }[];

  // Top merchants
  const topMerchants = db.prepare(`
    SELECT description, COUNT(*) as cnt, ROUND(SUM(amount)) as total, ROUND(AVG(amount)) as avg_amt
    FROM transactions WHERE type='expense' AND description IS NOT NULL
    GROUP BY description ORDER BY total DESC LIMIT 10
  `).all() as { description: string; cnt: number; total: number; avg_amt: number }[];

  // Day of week pattern
  const dayOfWeek = db.prepare(`
    SELECT CASE CAST(strftime('%w', date) AS INTEGER)
      WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue' WHEN 3 THEN 'Wed'
      WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat' END as day,
      CAST(strftime('%w', date) AS INTEGER) as day_num,
      ROUND(AVG(daily_total)) as avg_spend
    FROM (
      SELECT date, SUM(amount) as daily_total FROM transactions WHERE type='expense' GROUP BY date
    ) GROUP BY strftime('%w', date) ORDER BY strftime('%w', date)
  `).all() as { day: string; day_num: number; avg_spend: number }[];

  // Weekly trend (last 8 weeks)
  const weeklyTrend = db.prepare(`
    SELECT strftime('%Y-W%W', date) as week, ROUND(SUM(amount)) as total
    FROM transactions WHERE type='expense' AND date >= date('now', '-56 days')
    GROUP BY week ORDER BY week
  `).all() as { week: string; total: number }[];

  // Outliers (>2.5x category average)
  const outliers = db.prepare(`
    SELECT t.id, t.date, t.description, ROUND(t.amount) as amount, c.name as category, c.color,
      (SELECT ROUND(AVG(t2.amount)) FROM transactions t2 WHERE t2.category_id = t.category_id AND t2.type='expense') as cat_avg
    FROM transactions t JOIN categories c ON t.category_id = c.id
    WHERE t.type='expense' AND t.amount > (SELECT AVG(t2.amount) * 2.5 FROM transactions t2 WHERE t2.category_id = t.category_id AND t2.type='expense')
    ORDER BY t.amount DESC LIMIT 10
  `).all() as { id: string; date: string; description: string; amount: number; category: string; color: string; cat_avg: number }[];

  // Best and worst months
  const monthlyWithNet = monthly.map(m => ({ ...m, net: m.income - m.expenses }));
  const bestMonth = monthlyWithNet.reduce((a, b) => a.net > b.net ? a : b, monthlyWithNet[0]);
  const worstMonth = monthlyWithNet.reduce((a, b) => a.net < b.net ? a : b, monthlyWithNet[0]);

  // Heaviest and lightest spending days
  const heaviestDay = dayOfWeek.reduce((a, b) => a.avg_spend > b.avg_spend ? a : b, dayOfWeek[0]);
  const lightestDay = dayOfWeek.reduce((a, b) => a.avg_spend < b.avg_spend ? a : b, dayOfWeek[0]);

  // Monthly average expense
  const activeMonths = monthly.filter(m => m.expenses > 0).length;
  const monthlyAvgExpense = activeMonths > 0 ? Math.round(totalExpense / activeMonths) : 0;

  return NextResponse.json({
    overview: {
      total_expense: totalExpense,
      total_income: totalIncome,
      balance: totalIncome - totalExpense,
      transaction_count: txnCount,
      avg_expense: avgExpense,
      monthly_avg_expense: monthlyAvgExpense,
    },
    monthly,
    byCategory,
    topMerchants,
    dayOfWeek,
    weeklyTrend,
    outliers,
    highlights: {
      best_month: bestMonth,
      worst_month: worstMonth,
      heaviest_day: heaviestDay,
      lightest_day: lightestDay,
      top_category: byCategory[0]?.name || "N/A",
      top_category_pct: totalExpense > 0 ? Math.round((byCategory[0]?.total || 0) / totalExpense * 100) : 0,
    },
  });
}
