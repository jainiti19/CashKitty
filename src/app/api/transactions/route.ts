import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const type = searchParams.get("type");
  const category_id = searchParams.get("category_id");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (date) {
    conditions.push("t.date = ?");
    params.push(date);
  }
  if (type) {
    conditions.push("t.type = ?");
    params.push(type);
  }
  if (category_id) {
    conditions.push("t.category_id = ?");
    params.push(parseInt(category_id));
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const transactions = db
    .prepare(
      `SELECT t.*, c.name as category_name, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
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
  const { type, amount, description, category_id, helper_name, date, invoice_image, ocr_raw } = body;

  if (!type || !amount || amount <= 0 || !helper_name || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (type !== "income" && type !== "expense") {
    return NextResponse.json({ error: "Type must be income or expense" }, { status: 400 });
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO transactions (id, type, amount, description, category_id, helper_name, invoice_image, ocr_raw, date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, type, amount, description || null, category_id || null, helper_name, invoice_image || null, ocr_raw || null, date);

  const transaction = db
    .prepare(
      `SELECT t.*, c.name as category_name, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`
    )
    .get(id);

  return NextResponse.json({ transaction }, { status: 201 });
}
