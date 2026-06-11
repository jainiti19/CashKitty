import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";

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
  const { emi, status } = await request.json();

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (emi !== undefined) { fields.push("emi = ?"); values.push(emi); }
  if (status !== undefined) { fields.push("status = ?"); values.push(status); }

  if (fields.length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });

  values.push(parseInt(id));
  db.prepare(`UPDATE loans SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  const loan = db.prepare("SELECT l.*, u.name as user_name FROM loans l JOIN users u ON l.user_id = u.id WHERE l.id = ?").get(parseInt(id));
  return NextResponse.json({ loan });
}
