import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, monthly_limit, color, icon } = body;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (name !== undefined) { fields.push("name = ?"); values.push(name); }
  if (monthly_limit !== undefined) { fields.push("monthly_limit = ?"); values.push(monthly_limit); }
  if (color !== undefined) { fields.push("color = ?"); values.push(color); }
  if (icon !== undefined) { fields.push("icon = ?"); values.push(icon); }

  if (fields.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(parseInt(id));
  db.prepare(`UPDATE payment_channels SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  const channel = db.prepare("SELECT * FROM payment_channels WHERE id = ?").get(parseInt(id));
  return NextResponse.json({ channel });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = db.prepare("DELETE FROM payment_channels WHERE id = ?").run(parseInt(id));
  if (result.changes === 0) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
