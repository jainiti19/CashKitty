"use client";

import { useState, useEffect } from "react";
import type { DailyReport } from "@/types";
import CategoryBadge from "@/components/CategoryBadge";
import { format } from "date-fns";
import { fmt } from "@/lib/config";

export default function DailyReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [report, setReport] = useState<DailyReport | null>(null);

  useEffect(() => {
    fetch(`/api/reports/daily?date=${date}`)
      .then((r) => r.json())
      .then(setReport);
  }, [date]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Daily Report</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm"
        />
      </div>

      {report && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-5 text-center shadow-sm">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Income</div>
              <div className="text-2xl font-bold text-emerald-600 tracking-tight">
                {fmt(report.total_income)}
              </div>
            </div>
            <div className="glass rounded-2xl p-5 text-center shadow-sm">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Expenses</div>
              <div className="text-2xl font-bold text-orange-500 tracking-tight">
                {fmt(report.total_expense)}
              </div>
            </div>
            <div className="glass rounded-2xl p-5 text-center shadow-sm">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Net</div>
              <div className={`text-2xl font-bold tracking-tight ${report.net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {fmt(report.net)}
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100/50">
              <h3 className="font-bold text-gray-800">
                {format(new Date(date), "dd MMMM yyyy")}
              </h3>
            </div>
            {report.transactions.length === 0 ? (
              <div className="p-10 text-center text-gray-400">No transactions on this date.</div>
            ) : (
              <div className="divide-y divide-gray-100/50">
                {report.transactions.map((t, i) => (
                  <div
                    key={t.id}
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-white/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                        t.type === "income" ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
                      }`}>
                        {t.type === "income" ? "↗" : "↘"}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">
                          {t.description || (t.type === "income" ? "Money Added" : "Expense")}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                          <span>{t.helper_name}</span>
                          {t.category_name && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-gray-300" />
                              <CategoryBadge name={t.category_name} color={t.category_color} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`font-bold text-sm ${t.type === "income" ? "text-emerald-600" : "text-orange-500"}`}>
                      {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
