"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { UserSession } from "@/types";

interface LoginFormProps {
  onLogin: (session: UserSession) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((d) => setNeedsSetup(d.needs_setup));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLogin({ ...data.user, token: data.token });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLogin({ ...data.user, token: data.token });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (needsSetup === null) return null;

  const isSetup = needsSetup;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f3ef] via-[#f0ebe3] to-[#e8e0d4] flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-sm border border-[#d4c9b8]/40 rounded-3xl shadow-2xl p-8 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="CashKitty" width={72} height={72} className="mx-auto mb-4 rounded-2xl shadow-lg" />
          <h1 className="text-2xl font-bold text-[#2c2418] tracking-tight">CashKitty</h1>
          <p className="text-[#8b7355] mt-1 text-sm">
            {isSetup ? "Create your admin account" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={isSetup ? handleSetup : handleLogin}>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-2">
              {isSetup ? "Your Name" : "Name"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-white border border-[#d4c9b8] rounded-xl text-[#2c2418] focus:outline-none focus:ring-2 focus:ring-[#5c6b3c]/30 focus:border-[#5c6b3c] transition-all"
              autoFocus
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSetup ? "Create a password (min 4 chars)" : "Enter your password"}
              className="w-full px-4 py-3 bg-white border border-[#d4c9b8] rounded-xl text-[#2c2418] focus:outline-none focus:ring-2 focus:ring-[#5c6b3c]/30 focus:border-[#5c6b3c] transition-all"
              required
              minLength={4}
            />
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name || !password}
            className="w-full bg-gradient-to-r from-[#5c6b3c] to-[#4a5630] text-white py-3.5 rounded-xl font-semibold hover:from-[#4a5630] hover:to-[#3d4828] disabled:opacity-40 transition-all shadow-lg shadow-[#5c6b3c]/25 active:scale-[0.98]"
          >
            {loading ? "..." : isSetup ? "Create Admin Account" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
