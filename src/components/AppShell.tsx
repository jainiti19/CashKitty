"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Image from "next/image";
import Navbar from "./Navbar";
import HelperNamePrompt from "./HelperNamePrompt";
import LandingPage from "./LandingPage";

interface UserInfo {
  name: string;
  role: string;
}

const HelperContext = createContext<UserInfo>({ name: "", role: "" });

export function useHelperName() {
  const user = useContext(HelperContext);
  return user.name;
}

export function useUserInfo() {
  return useContext(HelperContext);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem("cashkitty_helper_name");
    const storedRole = localStorage.getItem("cashkitty_helper_role");
    if (storedName) setUser({ name: storedName, role: storedRole || "helper" });
    setLoaded(true);
  }, []);

  function handleSetUser(name: string, role: string) {
    localStorage.setItem("cashkitty_helper_name", name);
    localStorage.setItem("cashkitty_helper_role", role);
    setUser({ name, role });
    setShowNamePrompt(false);
  }

  function handleChangeName() {
    localStorage.removeItem("cashkitty_helper_name");
    localStorage.removeItem("cashkitty_helper_role");
    setUser(null);
    setShowNamePrompt(false);
  }

  if (!loaded) return null;

  if (!user) {
    if (showNamePrompt) {
      return <HelperNamePrompt onSubmit={handleSetUser} />;
    }
    return <LandingPage onGetStarted={() => setShowNamePrompt(true)} />;
  }

  return (
    <HelperContext.Provider value={user}>
      <div className="flex min-h-screen">
        <Navbar helperName={user.name} role={user.role} onChangeName={handleChangeName} />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center justify-center gap-3 py-3 bg-[#f0ebe3]/80 backdrop-blur-md border-b border-[#d4c9b8]/50 sticky top-0 z-10">
            <Image src="/logo.png" alt="CashKitty" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-bold text-[#2c2418] tracking-tight">CashKitty</span>
          </div>
          <div className="p-6 animate-fade-in">{children}</div>
        </main>
      </div>
    </HelperContext.Provider>
  );
}
