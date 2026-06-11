import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import db from "./db";

const SECRET = "cashkitty-session-secret";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createToken(userId: number, passwordHash: string): string {
  return createHash("sha256").update(`${userId}:${passwordHash}:${SECRET}`).digest("hex");
}

export function getSessionFromToken(token: string): { id: number; name: string; role: string } | null {
  if (!token) return null;

  const users = db.prepare("SELECT id, name, role, password FROM users WHERE active = 1").all() as {
    id: number; name: string; role: string; password: string;
  }[];

  for (const user of users) {
    const expected = createToken(user.id, user.password);
    if (expected === token) {
      return { id: user.id, name: user.name, role: user.role };
    }
  }

  return null;
}

export function getSessionFromRequest(request: Request): { id: number; name: string; role: string } | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return getSessionFromToken(auth.slice(7));
}

export function requireRole(request: Request, roles: string[]): { id: number; name: string; role: string } {
  const session = getSessionFromRequest(request);
  if (!session) throw new Error("Unauthorized");
  if (!roles.includes(session.role)) throw new Error("Forbidden");
  return session;
}

export function hasUsers(): boolean {
  const result = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  return result.count > 0;
}
