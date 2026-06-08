"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/add-money", label: "Add Money", icon: "💰" },
  { href: "/record-expense", label: "Record Expense", icon: "🧾" },
  { href: "/transactions", label: "Transactions", icon: "📋" },
  { href: "/daily-report", label: "Daily Report", icon: "📅" },
  { href: "/trends", label: "Trends", icon: "📈" },
  { href: "/categories", label: "Categories", icon: "🏷️" },
];

const roleLabels: Record<string, string> = {
  helper: "Helper",
  employer: "Employer",
  family: "Family",
};

export default function Navbar({ helperName, role, onChangeName }: { helperName: string; role: string; onChangeName: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gradient-to-b from-[#3a3226] to-[#2c2418] text-white min-h-screen flex flex-col shrink-0 shadow-xl">
      <div className="p-5 border-b border-white/10 flex items-center gap-3">
        <Image src="/logo.png" alt="CashKitty" width={38} height={38} className="rounded-xl shadow-md" />
        <h1 className="text-xl font-bold tracking-tight">CashKitty</h1>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 mt-1">
        {links.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 animate-slide-in ${
              pathname === link.href
                ? "bg-[#5c6b3c]/30 text-[#c8d4a9] shadow-sm"
                : "text-[#a69279] hover:bg-white/5 hover:text-[#d4c9b8]"
            }`}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <span className="text-base">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 m-3 mb-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7a8a56] to-[#5c6b3c] flex items-center justify-center text-white font-bold text-sm shadow-md">
            {helperName[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate text-[#d4c9b8]">{helperName}</div>
            <div className="text-xs text-[#8b7355]">{roleLabels[role] || role}</div>
          </div>
          <button
            onClick={onChangeName}
            className="text-xs text-[#8b7355] hover:text-[#d4c9b8] transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
          >
            Switch
          </button>
        </div>
      </div>
    </aside>
  );
}
