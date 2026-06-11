import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyPassword, createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { name, password } = await request.json();

  if (!name || !password) {
    return NextResponse.json({ error: "Name and password required" }, { status: 400 });
  }

  const user = db.prepare(
    "SELECT id, name, role, password, salary, active FROM users WHERE name = ? AND active = 1"
  ).get(name) as { id: number; name: string; role: string; password: string; salary: number | null; active: number } | undefined;

  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = createToken(user.id, user.password);

  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role },
    token,
  });
}
