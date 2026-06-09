import db from "./db";
import { KEYWORD_MAP } from "./category-recommender";
import type { FraudFlag, Alert } from "@/types";

interface AlertInput {
  type: "category_deviation" | "upward_trend" | "invoice_mismatch";
  severity: "low" | "medium" | "high";
  message: string;
  details: Record<string, unknown>;
  transaction_ids: string[] | null;
  recommendation: string;
}

// --- 1. Category Spending Deviation ---

export function detectCategoryDeviation(): AlertInput[] {
  const alerts: AlertInput[] = [];

  const currentWeek = db
    .prepare(
      `SELECT c.id as category_id, c.name as category_name,
              SUM(t.amount) as total,
              GROUP_CONCAT(t.id) as txn_ids
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.type = 'expense' AND t.date >= date('now', '-7 days')
       GROUP BY c.id`
    )
    .all() as { category_id: number; category_name: string; total: number; txn_ids: string }[];

  const previousWeek = db
    .prepare(
      `SELECT c.id as category_id, c.name as category_name,
              SUM(t.amount) as total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.type = 'expense'
         AND t.date >= date('now', '-14 days')
         AND t.date < date('now', '-7 days')
       GROUP BY c.id`
    )
    .all() as { category_id: number; category_name: string; total: number }[];

  const prevMap = new Map(previousWeek.map((r) => [r.category_id, r.total]));

  for (const curr of currentWeek) {
    const prev = prevMap.get(curr.category_id);

    if (!prev || prev === 0) {
      if (curr.total > 0) {
        alerts.push({
          type: "category_deviation",
          severity: "medium",
          message: `New spending in ${curr.category_name}: ${Math.round(curr.total)} this week with no spending last week.`,
          details: { category: curr.category_name, current: curr.total, previous: 0, change_pct: null },
          transaction_ids: curr.txn_ids.split(","),
          recommendation: `First time spending on ${curr.category_name} this period. Verify these are legitimate expenses.`,
        });
      }
      continue;
    }

    const changePct = ((curr.total - prev) / prev) * 100;

    if (changePct > 100) {
      alerts.push({
        type: "category_deviation",
        severity: "high",
        message: `${curr.category_name} spending up ${Math.round(changePct)}% vs last week (${Math.round(prev)} → ${Math.round(curr.total)}).`,
        details: { category: curr.category_name, current: curr.total, previous: prev, change_pct: Math.round(changePct) },
        transaction_ids: curr.txn_ids.split(","),
        recommendation: `${curr.category_name} spending more than doubled. Review recent ${curr.category_name} transactions for accuracy.`,
      });
    } else if (changePct > 50) {
      alerts.push({
        type: "category_deviation",
        severity: "medium",
        message: `${curr.category_name} spending up ${Math.round(changePct)}% vs last week (${Math.round(prev)} → ${Math.round(curr.total)}).`,
        details: { category: curr.category_name, current: curr.total, previous: prev, change_pct: Math.round(changePct) },
        transaction_ids: curr.txn_ids.split(","),
        recommendation: `Moderate increase in ${curr.category_name}. Worth a quick check.`,
      });
    }
  }

  return alerts;
}

// --- 2. Upward Spending Trend ---

export function detectUpwardTrend(): AlertInput[] {
  const weeks = db
    .prepare(
      `SELECT strftime('%Y-W%W', date) as week, SUM(amount) as total
       FROM transactions
       WHERE type = 'expense' AND date >= date('now', '-42 days')
       GROUP BY week ORDER BY week`
    )
    .all() as { week: string; total: number }[];

  if (weeks.length < 3) return [];

  let consecutiveIncreases = 0;
  let maxStreak = 0;
  const growthRates: number[] = [];

  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i].total > weeks[i - 1].total) {
      consecutiveIncreases++;
      const rate = ((weeks[i].total - weeks[i - 1].total) / weeks[i - 1].total) * 100;
      growthRates.push(Math.round(rate));
      if (consecutiveIncreases > maxStreak) maxStreak = consecutiveIncreases;
    } else {
      consecutiveIncreases = 0;
      growthRates.length = 0;
    }
  }

  if (maxStreak < 2) return [];

  let severity: "low" | "medium" | "high";
  if (maxStreak >= 4) severity = "high";
  else if (maxStreak >= 3) severity = "medium";
  else severity = "low";

  const avgGrowth = growthRates.length > 0
    ? Math.round(growthRates.reduce((a, b) => a + b, 0) / growthRates.length)
    : 0;

  return [
    {
      type: "upward_trend",
      severity,
      message: `Spending has increased for ${maxStreak + 1} consecutive weeks with an average growth of ${avgGrowth}% per week.`,
      details: {
        consecutive_weeks: maxStreak + 1,
        avg_growth_pct: avgGrowth,
        weekly_totals: weeks.map((w) => ({ week: w.week, total: Math.round(w.total) })),
      },
      transaction_ids: null,
      recommendation: `Weekly spending is trending upward. Review if this is expected or if costs are creeping up.`,
    },
  ];
}

// --- 3. Invoice Mismatch Detection ---

export function detectInvoiceMismatch(
  categoryName: string,
  description: string,
  ocrRaw: string
): FraudFlag | null {
  if (!description && !ocrRaw) return null;

  const textToCheck = `${description} ${ocrRaw}`.toLowerCase();

  // Find which category the text actually matches
  let matchedCategory: string | null = null;
  let matchStrength = 0;

  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    const hits = keywords.filter((kw) => textToCheck.includes(kw)).length;
    if (hits > matchStrength) {
      matchStrength = hits;
      matchedCategory = category;
    }
  }

  if (!matchedCategory || matchStrength === 0) return null;

  if (matchedCategory.toLowerCase() === categoryName.toLowerCase()) return null;

  // Mismatch found
  const severity: "low" | "medium" | "high" = matchStrength >= 3 ? "high" : matchStrength >= 2 ? "medium" : "low";

  return {
    flagged: true,
    reason: `Invoice content matches "${matchedCategory}" but was categorized as "${categoryName}".`,
    severity,
  };
}

// --- 4. Orchestrator ---

export function runAllDetectors(): Alert[] {
  // Clear old statistical alerts (re-computed each time)
  db.prepare(
    "DELETE FROM alerts WHERE type IN ('category_deviation', 'upward_trend') AND resolved = 0"
  ).run();

  const categoryAlerts = detectCategoryDeviation();
  const trendAlerts = detectUpwardTrend();

  const insertStmt = db.prepare(
    `INSERT INTO alerts (type, severity, message, details, transaction_ids, recommendation)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  for (const a of [...categoryAlerts, ...trendAlerts]) {
    insertStmt.run(
      a.type,
      a.severity,
      a.message,
      JSON.stringify(a.details),
      a.transaction_ids ? JSON.stringify(a.transaction_ids) : null,
      a.recommendation
    );
  }

  // Return all unresolved alerts
  const allAlerts = db
    .prepare(
      "SELECT * FROM alerts WHERE resolved = 0 ORDER BY CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, detected_at DESC"
    )
    .all() as Record<string, unknown>[];

  return allAlerts.map((a) => ({
    id: a.id as number,
    type: a.type as Alert["type"],
    severity: a.severity as Alert["severity"],
    message: a.message as string,
    details: a.details ? JSON.parse(a.details as string) : null,
    transaction_ids: a.transaction_ids ? JSON.parse(a.transaction_ids as string) : null,
    recommendation: (a.recommendation as string) || null,
    detected_at: a.detected_at as string,
    resolved: !!a.resolved,
  }));
}
