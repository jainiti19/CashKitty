"use client";

import { useEffect, useState } from "react";
import type { Transaction } from "@/types";
import CategoryBadge from "./CategoryBadge";
import { format } from "date-fns";
import { fmt } from "@/lib/config";

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    fetch("/api/transactions?limit=5")
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions));
  }, []);

  if (transactions.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-[#8b7355]">
        No transactions yet. Add money or record an expense to get started.
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[#d4c9b8]/30">
        <h3 className="font-bold text-[#2c2418]">Recent Transactions</h3>
      </div>
      <div className="divide-y divide-[#d4c9b8]/20">
        {transactions.map((t, i) => (
          <div
            key={t.id}
            className="px-6 py-3.5 flex items-center justify-between hover:bg-[#f0ebe3]/50 transition-colors animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                t.type === "income"
                  ? "bg-[#5c6b3c]/15 text-[#5c6b3c]"
                  : "bg-[#96623c]/15 text-[#96623c]"
              }`}>
                {t.type === "income" ? "↗" : "↘"}
              </div>
              <div>
                <div className="text-sm font-semibold text-[#2c2418]">
                  {t.description || (t.type === "income" ? "Money Added" : "Expense")}
                </div>
                <div className="text-xs text-[#8b7355] flex items-center gap-2 mt-0.5">
                  <span>{format(new Date(t.date), "dd MMM")}</span>
                  <span className="w-1 h-1 rounded-full bg-[#d4c9b8]" />
                  <span>{t.helper_name}</span>
                  {t.category_name && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-[#d4c9b8]" />
                      <CategoryBadge name={t.category_name} color={t.category_color} />
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className={`font-bold text-sm ${t.type === "income" ? "text-[#5c6b3c]" : "text-[#96623c]"}`}>
              {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
