"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Image from "next/image";
import Navbar from "./Navbar";
import LoginForm from "./LoginForm";
import LandingPage from "./LandingPage";
import type { UserSession } from "@/types";

const UserContext = createContext<UserSession>({ id: 0, name: "", role: "helper", token: "" });

export function useHelperName() {
  return useContext(UserContext).name;
}

export function useUserInfo() {
  return useContext(UserContext);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cashkitty_session");
    if (stored) {
      try { setSession(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setLoaded(true);
  }, []);

  function handleLogin(s: UserSession) {
    localStorage.setItem("cashkitty_session", JSON.stringify(s));
    setSession(s);
    setShowLogin(false);
  }

  function handleLogout() {
    localStorage.removeItem("cashkitty_session");
    setSession(null);
    setShowLogin(false);
  }

  if (!loaded) return null;

  if (!session) {
    if (showLogin) return <LoginForm onLogin={handleLogin} />;
    return <LandingPage onGetStarted={() => setShowLogin(true)} />;
  }

  return (
    <UserContext.Provider value={session}>
      <div className="flex min-h-screen">
        <Navbar userName={session.name} role={session.role} onLogout={handleLogout} />
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <div className="md:hidden flex items-center justify-center gap-2 py-3 bg-[#f0ebe3]/80 backdrop-blur-md border-b border-[#d4c9b8]/50 sticky top-0 z-30">
            <Image src="/logo.png" alt="CashKitty" width={28} height={28} className="rounded-lg" />
            <span className="text-base font-bold text-[#2c2418] tracking-tight">CashKitty</span>
          </div>
          <div className="hidden md:flex items-center justify-center gap-3 py-3 bg-[#f0ebe3]/80 backdrop-blur-md border-b border-[#d4c9b8]/50 sticky top-0 z-10">
            <Image src="/logo.png" alt="CashKitty" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-bold text-[#2c2418] tracking-tight">CashKitty</span>
          </div>
          <div className="p-4 md:p-6 animate-fade-in">{children}</div>
        </main>
      </div>
    </UserContext.Provider>
  );
}
