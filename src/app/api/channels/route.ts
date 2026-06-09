import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const channels = db.prepare("SELECT * FROM payment_channels ORDER BY id").all() as Record<string, unknown>[];

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const enriched = channels.map((ch) => {
    const funded = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE type = 'income' AND channel_id = ? AND strftime('%Y-%m', date) = ?`
    ).get(ch.id, currentMonth) as { total: number };

    const spent = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE type = 'expense' AND channel_id = ? AND strftime('%Y-%m', date) = ?`
    ).get(ch.id, currentMonth) as { total: number };

    const monthlyLimit = ch.monthly_limit as number | null;
    const remaining = monthlyLimit != null
      ? monthlyLimit - spent.total
      : funded.total - spent.total;

    return {
      ...ch,
      funded: funded.total,
      spent: spent.total,
      remaining,
    };
  });

  return NextResponse.json({ channels: enriched });
}

export async function POST(request: NextRequest) {
  const { name, type, monthly_limit, color, icon } = await request.json();

  if (!name || !type) {
    return NextResponse.json({ error: "Name and type required" }, { status: 400 });
  }

  try {
    const result = db.prepare(
      `INSERT INTO payment_channels (name, type, monthly_limit, color, icon) VALUES (?, ?, ?, ?, ?)`
    ).run(name, type, monthly_limit || null, color || "#6B7280", icon || "💵");

    const channel = db.prepare("SELECT * FROM payment_channels WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json({ channel }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Channel already exists" }, { status: 409 });
  }
}
