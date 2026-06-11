import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRole, hashPassword } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    requireRole(request, ["employer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = db.prepare(
    "SELECT id, name, role, salary, active, created_at FROM users ORDER BY role, name"
  ).all();

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  try {
    requireRole(request, ["employer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, role, password, salary } = await request.json();

  if (!name || !role || !password || password.length < 4) {
    return NextResponse.json({ error: "Name, role, and password (min 4 chars) required" }, { status: 400 });
  }

  const hashed = hashPassword(password);

  try {
    const result = db.prepare(
      "INSERT INTO users (name, role, password, salary) VALUES (?, ?, ?, ?)"
    ).run(name, role, hashed, salary || null);

    const user = db.prepare(
      "SELECT id, name, role, salary, active, created_at FROM users WHERE id = ?"
    ).get(result.lastInsertRowid);

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
