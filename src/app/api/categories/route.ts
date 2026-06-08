import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const categories = db.prepare(`SELECT * FROM categories ORDER BY name`).all();
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, color } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const result = db
      .prepare(`INSERT INTO categories (name, color) VALUES (?, ?)`)
      .run(name, color || "#6B7280");

    const category = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(result.lastInsertRowid);
    return NextResponse.json({ category }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }
}
