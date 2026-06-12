import db from "./db";

interface DuplicateCheck {
  isDuplicate: boolean;
  matchType: "exact" | "similar" | null;
  existingTransaction: { id: string; amount: number; description: string; date: string; created_at: string } | null;
  message: string | null;
}

/**
 * Check if a transaction looks like a duplicate.
 *
 * Rules:
 * 1. EXACT: Same amount + same date + same helper + within last 5 minutes → almost certainly duplicate
 * 2. SIMILAR: Same amount + same date + similar description → likely duplicate
 * 3. NEAR: Same amount + within last 10 minutes (any date) → possibly duplicate (quick re-entry)
 */
export function checkDuplicate(
  type: "income" | "expense",
  amount: number,
  description: string | null,
  helperName: string,
  date: string
): DuplicateCheck {
  const noDup: DuplicateCheck = { isDuplicate: false, matchType: null, existingTransaction: null, message: null };

  // 1. Exact match: same amount + date + helper within last 5 minutes
  const exactMatch = db.prepare(
    `SELECT id, amount, description, date, created_at FROM transactions
     WHERE type = ? AND amount = ? AND date = ? AND helper_name = ?
       AND created_at >= datetime('now', '-5 minutes')
     ORDER BY created_at DESC LIMIT 1`
  ).get(type, amount, date, helperName) as { id: string; amount: number; description: string; date: string; created_at: string } | undefined;

  if (exactMatch) {
    return {
      isDuplicate: true,
      matchType: "exact",
      existingTransaction: exactMatch,
      message: `Duplicate? Same amount (${amount}) recorded ${timeSince(exactMatch.created_at)} ago by ${helperName}.`,
    };
  }

  // 2. Similar: same amount + same date + overlapping description words
  if (description && description.length > 2) {
    const sameDayAmount = db.prepare(
      `SELECT id, amount, description, date, created_at FROM transactions
       WHERE type = ? AND amount = ? AND date = ?
         AND created_at >= datetime('now', '-60 minutes')
       ORDER BY created_at DESC LIMIT 1`
    ).get(type, amount, date) as { id: string; amount: number; description: string; date: string; created_at: string } | undefined;

    if (sameDayAmount && sameDayAmount.description) {
      const similarity = wordOverlap(description, sameDayAmount.description);
      if (similarity > 0.4) {
        return {
          isDuplicate: true,
          matchType: "similar",
          existingTransaction: sameDayAmount,
          message: `Possible duplicate? Similar entry (${sameDayAmount.description}: ${amount}) recorded ${timeSince(sameDayAmount.created_at)} ago.`,
        };
      }
    }
  }

  // 3. Near: same amount within last 3 minutes (quick re-submit)
  const recentSame = db.prepare(
    `SELECT id, amount, description, date, created_at FROM transactions
     WHERE type = ? AND amount = ? AND created_at >= datetime('now', '-3 minutes')
     ORDER BY created_at DESC LIMIT 1`
  ).get(type, amount) as { id: string; amount: number; description: string; date: string; created_at: string } | undefined;

  if (recentSame) {
    return {
      isDuplicate: true,
      matchType: "similar",
      existingTransaction: recentSame,
      message: `Just recorded ${amount} moments ago (${recentSame.description || "N/A"}). Duplicate?`,
    };
  }

  return noDup;
}

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

function timeSince(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}
