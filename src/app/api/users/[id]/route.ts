import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRole, hashPassword } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRole(request, ["employer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (body.name !== undefined) { fields.push("name = ?"); values.push(body.name); }
  if (body.role !== undefined) { fields.push("role = ?"); values.push(body.role); }
  if (body.salary !== undefined) { fields.push("salary = ?"); values.push(body.salary); }
  if (body.active !== undefined) { fields.push("active = ?"); values.push(body.active ? 1 : 0); }
  if (body.password) { fields.push("password = ?"); values.push(hashPassword(body.password)); }

  if (fields.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(parseInt(id));
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  const user = db.prepare(
    "SELECT id, name, role, salary, active, created_at FROM users WHERE id = ?"
  ).get(parseInt(id));

  return NextResponse.json({ user });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRole(request, ["employer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  db.prepare("UPDATE users SET active = 0 WHERE id = ?").run(parseInt(id));
  return NextResponse.json({ success: true });
}
