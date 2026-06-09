"use client";

import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { fmt } from "@/lib/config";

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

export default function TrendsPage() {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [granularity, setGranularity] = useState("day");
  const [data, setData] = useState<TrendPeriod[]>([]);
  const [summary, setSummary] = useState<TrendSummary | null>(null);

  useEffect(() => {
    fetch(`/api/reports/trends?from=${from}&to=${to}&granularity=${granularity}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.data);
        setSummary(d.summary);
      });
  }, [from, to, granularity]);

  const categoryTotals = new Map<string, { amount: number; color: string }>();
  for (const d of data) {
    for (const cat of d.by_category) {
      const existing = categoryTotals.get(cat.category);
      if (existing) {
        existing.amount += cat.amount;
      } else {
        categoryTotals.set(cat.category, { amount: cat.amount, color: cat.color });
      }
    }
  }
  const pieData = Array.from(categoryTotals.entries()).map(([name, val]) => ({
    name,
    value: val.amount,
    color: val.color,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Trends & Insights</h2>

      <div className="glass rounded-2xl p-4 shadow-sm flex gap-3 flex-wrap items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Period</label>
          <select value={granularity} onChange={(e) => setGranularity(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="glass rounded-2xl p-5 text-center shadow-sm">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Spend</div>
            <div className="text-2xl font-bold text-orange-500 tracking-tight">{fmt(summary.total_spend)}</div>
          </div>
          <div className="glass rounded-2xl p-5 text-center shadow-sm">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Avg Daily Spend</div>
            <div className="text-2xl font-bold text-gray-800 tracking-tight">{fmt(summary.avg_daily_spend)}</div>
          </div>
          <div className="glass rounded-2xl p-5 text-center shadow-sm">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Top Category</div>
            <div className="text-2xl font-bold text-gray-800 tracking-tight">{summary.top_category}</div>
          </div>
        </div>
      )}

      {data.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 text-sm">Spending Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data}>
                <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Line type="monotone" dataKey="total_expense" stroke="#f97316" name="Expense" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="total_income" stroke="#22c55e" name="Income" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 text-sm">Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name} strokeWidth={2} stroke="#fff">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-5 shadow-sm lg:col-span-2">
            <h3 className="font-bold text-gray-800 mb-4 text-sm">Income vs Expense</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data}>
                <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Legend />
                <Bar dataKey="total_income" fill="#22c55e" name="Income" radius={[6, 6, 0, 0]} />
                <Bar dataKey="total_expense" fill="#f97316" name="Expense" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-14 text-center text-gray-400">
          No data for the selected period.
        </div>
      )}
    </div>
  );
}
