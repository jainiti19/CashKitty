import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { detectInvoiceMismatch } from "@/lib/fraud-detector";
import { checkDuplicate } from "@/lib/duplicate-detector";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const type = searchParams.get("type");
  const category_id = searchParams.get("category_id");
  const channel_id = searchParams.get("channel_id");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (date) { conditions.push("t.date = ?"); params.push(date); }
  if (type) { conditions.push("t.type = ?"); params.push(type); }
  if (category_id) { conditions.push("t.category_id = ?"); params.push(parseInt(category_id)); }
  if (channel_id) { conditions.push("t.channel_id = ?"); params.push(parseInt(channel_id)); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const transactions = db
    .prepare(
      `SELECT t.*, c.name as category_name, c.color as category_color,
              pc.name as channel_name, pc.icon as channel_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN payment_channels pc ON t.channel_id = pc.id
       ${where}
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  const countResult = db
    .prepare(`SELECT COUNT(*) as total FROM transactions t ${where}`)
    .get(...params) as { total: number };

  return NextResponse.json({ transactions, total: countResult.total });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, amount, description, category_id, helper_name, date, invoice_image, ocr_raw, channel_id } = body;

  if (!type || !amount || amount <= 0 || !helper_name || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (type !== "income" && type !== "expense") {
    return NextResponse.json({ error: "Type must be income or expense" }, { status: 400 });
  }

  // Check channel limit warning (don't block, just include in response)
  let limitWarning: string | null = null;
  if (type === "expense" && channel_id) {
    const channel = db.prepare("SELECT * FROM payment_channels WHERE id = ?").get(channel_id) as Record<string, unknown> | undefined;
    if (channel && channel.monthly_limit) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthSpent = db.prepare(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
         WHERE type = 'expense' AND channel_id = ? AND strftime('%Y-%m', date) = ?`
      ).get(channel_id, currentMonth) as { total: number };

      const newTotal = monthSpent.total + amount;
      if (newTotal > (channel.monthly_limit as number)) {
        limitWarning = `This expense exceeds the monthly limit of ${channel.monthly_limit} for ${channel.name}. Current month total: ${Math.round(newTotal)}`;
      }
    }
  }

  // Duplicate detection (warn, don't block)
  const dupCheck = checkDuplicate(type, amount, description || null, helper_name, date);
  let dupWarning: string | null = null;
  if (dupCheck.isDuplicate) {
    dupWarning = dupCheck.message;
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO transactions (id, type, amount, description, category_id, helper_name, invoice_image, ocr_raw, date, channel_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, type, amount, description || null, category_id || null, helper_name, invoice_image || null, ocr_raw || null, date, channel_id || null);

  // Invoice-level fraud check
  if (type === "expense" && category_id) {
    const category = db.prepare("SELECT name FROM categories WHERE id = ?").get(category_id) as { name: string } | undefined;
    if (category) {
      const flag = detectInvoiceMismatch(category.name, description || "", ocr_raw || "");
      if (flag && flag.flagged) {
        db.prepare("UPDATE transactions SET fraud_flag = ? WHERE id = ?").run(JSON.stringify(flag), id);
        db.prepare(
          `INSERT INTO alerts (type, severity, message, details, transaction_ids, recommendation)
           VALUES ('invoice_mismatch', ?, ?, ?, ?, ?)`
        ).run(flag.severity, flag.reason, JSON.stringify({ category: category.name, description }), JSON.stringify([id]),
          `Review this expense. The invoice content doesn't match the "${category.name}" category.`);
      }
    }
  }

  const transaction = db
    .prepare(
      `SELECT t.*, c.name as category_name, c.color as category_color,
              pc.name as channel_name, pc.icon as channel_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN payment_channels pc ON t.channel_id = pc.id
       WHERE t.id = ?`
    )
    .get(id);

  return NextResponse.json({ transaction, limit_warning: limitWarning, duplicate_warning: dupWarning }, { status: 201 });
}
