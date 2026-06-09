"use client";

import BalanceCard from "@/components/BalanceCard";
import RecentTransactions from "@/components/RecentTransactions";
import Link from "next/link";
import AlertBanner from "@/components/AlertBanner";

export default function Dashboard() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-[#2c2418] tracking-tight">Dashboard</h2>

      <AlertBanner />

      <BalanceCard />

      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/add-money"
          className="bg-gradient-to-r from-[#5c6b3c] to-[#4a5630] text-white rounded-2xl p-5 text-center font-semibold hover:from-[#4a5630] hover:to-[#3d4828] transition-all shadow-lg shadow-[#5c6b3c]/20 active:scale-[0.98]"
        >
          <span className="text-2xl block mb-1">💰</span>
          Add Money
        </Link>
        <Link
          href="/record-expense"
          className="bg-gradient-to-r from-[#96623c] to-[#7d5132] text-white rounded-2xl p-5 text-center font-semibold hover:from-[#7d5132] hover:to-[#6b4529] transition-all shadow-lg shadow-[#96623c]/20 active:scale-[0.98]"
        >
          <span className="text-2xl block mb-1">🧾</span>
          Record Expense
        </Link>
      </div>

      <RecentTransactions />
    </div>
  );
}
