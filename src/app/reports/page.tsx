"use client";

import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { fmt } from "@/lib/config";
import type { DailyReport, Transaction } from "@/types";
import CategoryBadge from "@/components/CategoryBadge";

type Tab = "daily" | "trends";

interface TrendPeriod {
  period: string;
  total_expense: number;
  total_income: number;
  by_category: { category: string; color: string; amount: number }[];
}

interface TrendSummary {
  top_category: string;
  total_spend: number;
  avg_daily_spend: number;
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("daily");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-[#2c2418] tracking-tight">Reports</h2>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#d4c9b8]/30 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("daily")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "daily" ? "bg-white text-[#2c2418] shadow-sm" : "text-[#8b7355]"
          }`}
        >
          📅 Daily Report
        </button>
        <button
          onClick={() => setTab("trends")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "trends" ? "bg-white text-[#2c2418] shadow-sm" : "text-[#8b7355]"
          }`}
        >
          📈 Trends
        </button>
      </div>

      {tab === "daily" ? <DailySection /> : <TrendsSection />}
    </div>
  );
}

function DailySection() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [report, setReport] = useState<DailyReport | null>(null);

  useEffect(() => {
    fetch(`/api/reports/daily?date=${date}`)
      .then((r) => r.json())
      .then(setReport);
  }, [date]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5c6b3c]/30 shadow-sm"
        />
      </div>

      {report && (
        <>
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="glass rounded-2xl p-3 md:p-5 text-center shadow-sm">
              <div className="text-[10px] md:text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Income</div>
              <div className="text-lg md:text-2xl font-bold text-[#5c6b3c] tracking-tight">{fmt(report.total_income)}</div>
            </div>
            <div className="glass rounded-2xl p-3 md:p-5 text-center shadow-sm">
              <div className="text-[10px] md:text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Expenses</div>
              <div className="text-lg md:text-2xl font-bold text-[#96623c] tracking-tight">{fmt(report.total_expense)}</div>
            </div>
            <div className="glass rounded-2xl p-3 md:p-5 text-center shadow-sm">
              <div className="text-[10px] md:text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Net</div>
              <div className={`text-lg md:text-2xl font-bold tracking-tight ${report.net >= 0 ? "text-[#5c6b3c]" : "text-red-500"}`}>
                {fmt(report.net)}
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#d4c9b8]/30">
              <h3 className="font-bold text-[#2c2418] text-sm">{format(new Date(date), "dd MMMM yyyy")}</h3>
            </div>
            {report.transactions.length === 0 ? (
              <div className="p-8 text-center text-[#8b7355]">No transactions on this date.</div>
            ) : (
              <div className="divide-y divide-[#d4c9b8]/20">
                {report.transactions.map((t: Transaction, i: number) => (
                  <div key={t.id} className="px-5 py-3 flex items-center justify-between animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                        t.type === "income" ? "bg-[#5c6b3c]/15 text-[#5c6b3c]" : "bg-[#96623c]/15 text-[#96623c]"
                      }`}>
                        {t.type === "income" ? "↗" : "↘"}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#2c2418]">{t.description || (t.type === "income" ? "Money Added" : "Expense")}</div>
                        <div className="text-xs text-[#8b7355] flex items-center gap-2 mt-0.5">
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
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TrendsSection() {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [granularity, setGranularity] = useState("week");
  const [data, setData] = useState<TrendPeriod[]>([]);
  const [summary, setSummary] = useState<TrendSummary | null>(null);

  useEffect(() => {
    fetch(`/api/reports/trends?from=${from}&to=${to}&granularity=${granularity}`)
      .then((r) => r.json())
      .then((d) => { setData(d.data); setSummary(d.summary); });
  }, [from, to, granularity]);

  const categoryTotals = new Map<string, { amount: number; color: string }>();
  for (const d of data) {
    for (const cat of d.by_category) {
      const existing = categoryTotals.get(cat.category);
      if (existing) existing.amount += cat.amount;
      else categoryTotals.set(cat.category, { amount: cat.amount, color: cat.color });
    }
  }
  const pieData = Array.from(categoryTotals.entries()).map(([name, val]) => ({ name, value: val.amount, color: val.color }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="glass rounded-2xl p-3 md:p-4 shadow-sm flex gap-2 md:gap-3 flex-wrap items-end">
        <div>
          <label className="block text-[10px] md:text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5c6b3c]/30" />
        </div>
        <div>
          <label className="block text-[10px] md:text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5c6b3c]/30" />
        </div>
        <div>
          <label className="block text-[10px] md:text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Period</label>
          <select value={granularity} onChange={(e) => setGranularity(e.target.value)} className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5c6b3c]/30">
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="glass rounded-2xl p-3 md:p-5 text-center shadow-sm">
            <div className="text-[10px] md:text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Total Spend</div>
            <div className="text-lg md:text-2xl font-bold text-[#96623c] tracking-tight">{fmt(summary.total_spend)}</div>
          </div>
          <div className="glass rounded-2xl p-3 md:p-5 text-center shadow-sm">
            <div className="text-[10px] md:text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Avg Daily</div>
            <div className="text-lg md:text-2xl font-bold text-[#2c2418] tracking-tight">{fmt(summary.avg_daily_spend)}</div>
          </div>
          <div className="glass rounded-2xl p-3 md:p-5 text-center shadow-sm">
            <div className="text-[10px] md:text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Top Category</div>
            <div className="text-lg md:text-2xl font-bold text-[#2c2418] tracking-tight">{summary.top_category}</div>
          </div>
        </div>
      )}

      {data.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-4 md:p-5 shadow-sm">
            <h3 className="font-bold text-[#2c2418] mb-4 text-sm">Spending Over Time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data}>
                <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="#8b7355" />
                <YAxis tick={{ fontSize: 10 }} stroke="#8b7355" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Line type="monotone" dataKey="total_expense" stroke="#96623c" name="Expense" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="total_income" stroke="#5c6b3c" name="Income" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-4 md:p-5 shadow-sm">
            <h3 className="font-bold text-[#2c2418] mb-4 text-sm">Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label strokeWidth={2} stroke="#f5f3ef">
                  {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-4 md:p-5 shadow-sm lg:col-span-2">
            <h3 className="font-bold text-[#2c2418] mb-4 text-sm">Income vs Expense</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data}>
                <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="#8b7355" />
                <YAxis tick={{ fontSize: 10 }} stroke="#8b7355" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Legend />
                <Bar dataKey="total_income" fill="#5c6b3c" name="Income" radius={[6, 6, 0, 0]} />
                <Bar dataKey="total_expense" fill="#96623c" name="Expense" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center text-[#8b7355]">No data for the selected period.</div>
      )}
    </div>
  );
}
