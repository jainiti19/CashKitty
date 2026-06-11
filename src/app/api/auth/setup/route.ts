import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { hashPassword, createToken, hasUsers } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ needs_setup: !hasUsers() });
}

export async function POST(request: NextRequest) {
  if (hasUsers()) {
    return NextResponse.json({ error: "Setup already completed" }, { status: 400 });
  }

  const { name, password } = await request.json();

  if (!name || !password || password.length < 4) {
    return NextResponse.json({ error: "Name and password (min 4 chars) required" }, { status: 400 });
  }

  const hashed = hashPassword(password);
  const result = db.prepare(
    "INSERT INTO users (name, role, password) VALUES (?, 'employer', ?)"
  ).run(name, hashed);

  const user = db.prepare("SELECT id, name, role, password FROM users WHERE id = ?")
    .get(result.lastInsertRowid) as { id: number; name: string; role: string; password: string };

  const token = createToken(user.id, user.password);

  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role },
    token,
  }, { status: 201 });
}
