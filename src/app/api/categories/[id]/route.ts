import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, color } = body;

  const existing = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(parseInt(id));
  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (name) {
    fields.push("name = ?");
    values.push(name);
  }
  if (color) {
    fields.push("color = ?");
    values.push(color);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(parseInt(id));
  db.prepare(`UPDATE categories SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  const category = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(parseInt(id));
  return NextResponse.json({ category });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = db.prepare(`DELETE FROM categories WHERE id = ?`).run(parseInt(id));

  if (result.changes === 0) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
