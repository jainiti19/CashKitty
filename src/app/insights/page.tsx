"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/config";
import AlertBanner from "@/components/AlertBanner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

interface InsightsData {
  overview: {
    total_expense: number;
    total_income: number;
    balance: number;
    transaction_count: number;
    avg_expense: number;
    monthly_avg_expense: number;
  };
  monthly: { month: string; expenses: number; income: number }[];
  byCategory: { name: string; color: string; cnt: number; total: number; avg_amt: number; max_amt: number }[];
  topMerchants: { description: string; cnt: number; total: number; avg_amt: number }[];
  dayOfWeek: { day: string; avg_spend: number }[];
  weeklyTrend: { week: string; total: number }[];
  outliers: { id: string; date: string; description: string; amount: number; category: string; color: string; cat_avg: number }[];
  highlights: {
    best_month: { month: string; net: number };
    worst_month: { month: string; net: number };
    heaviest_day: { day: string; avg_spend: number };
    lightest_day: { day: string; avg_spend: number };
    top_category: string;
    top_category_pct: number;
  };
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);

  useEffect(() => {
    fetch("/api/reports/insights")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          {[0, 1, 2].map((i) => <div key={i} className="bg-[#d4c9b8]/30 rounded-2xl h-32" />)}
        </div>
      </div>
    );
  }

  const { overview, monthly, byCategory, topMerchants, dayOfWeek, weeklyTrend, outliers, highlights } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-[#2c2418] tracking-tight">Insights</h2>

      <AlertBanner />

      {/* Key Numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Spent" value={fmt(overview.total_expense)} />
        <StatCard label="Monthly Average" value={fmt(overview.monthly_avg_expense)} />
        <StatCard label="Avg Transaction" value={fmt(overview.avg_expense)} />
        <StatCard label="Total Transactions" value={String(overview.transaction_count)} />
      </div>

      {/* Highlight Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <InsightCard
          icon="📊"
          title="Top Category"
          value={`${highlights.top_category} (${highlights.top_category_pct}%)`}
          subtitle="of all spending"
        />
        <InsightCard
          icon="📅"
          title="Heaviest Day"
          value={highlights.heaviest_day?.day}
          subtitle={`avg ${fmt(highlights.heaviest_day?.avg_spend || 0)}/day`}
        />
        <InsightCard
          icon="🌙"
          title="Lightest Day"
          value={highlights.lightest_day?.day}
          subtitle={`avg ${fmt(highlights.lightest_day?.avg_spend || 0)}/day`}
        />
        <InsightCard
          icon="✅"
          title="Best Month"
          value={formatMonth(highlights.best_month?.month)}
          subtitle={`surplus of ${fmt(highlights.best_month?.net || 0)}`}
        />
        <InsightCard
          icon="⚠️"
          title="Worst Month"
          value={formatMonth(highlights.worst_month?.month)}
          subtitle={`deficit of ${fmt(Math.abs(highlights.worst_month?.net || 0))}`}
        />
        <InsightCard
          icon="💰"
          title="Balance"
          value={fmt(overview.balance)}
          subtitle="income minus expenses"
        />
      </div>

      {/* Monthly Income vs Expense */}
      <div className="glass rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-[#2c2418] mb-4 text-sm">Monthly Income vs Expenses</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthly.filter(m => m.expenses > 500)}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#8b7355" />
            <YAxis tick={{ fontSize: 11 }} stroke="#8b7355" />
            <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
            <Bar dataKey="income" fill="#5c6b3c" name="Income" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenses" fill="#96623c" name="Expenses" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="glass rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#2c2418] mb-4 text-sm">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                strokeWidth={2}
                stroke="#f5f3ef"
                label
              >
                {byCategory.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {byCategory.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: c.color }} />
                  <span className="text-[#2c2418] font-medium">{c.name}</span>
                  <span className="text-[#8b7355] text-xs">({c.cnt} txns)</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-[#2c2418]">{fmt(c.total)}</span>
                  <span className="text-[#8b7355] text-xs ml-2">avg {fmt(c.avg_amt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Day of Week Pattern */}
        <div className="glass rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#2c2418] mb-4 text-sm">Spending by Day of Week</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dayOfWeek}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#8b7355" />
              <YAxis tick={{ fontSize: 11 }} stroke="#8b7355" />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
              <Bar dataKey="avg_spend" fill="#5c6b3c" name="Avg Spend" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Trend */}
        <div className="glass rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#2c2418] mb-4 text-sm">Weekly Spending Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyTrend}>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="#8b7355" />
              <YAxis tick={{ fontSize: 11 }} stroke="#8b7355" />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
              <Line type="monotone" dataKey="total" stroke="#5c6b3c" strokeWidth={2.5} dot={{ r: 4, fill: "#5c6b3c" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Merchants */}
        <div className="glass rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#2c2418] mb-4 text-sm">Top Merchants</h3>
          <div className="space-y-3">
            {topMerchants.map((m, i) => (
              <div key={m.description} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="w-7 h-7 rounded-lg bg-[#5c6b3c]/10 flex items-center justify-center text-xs font-bold text-[#5c6b3c]">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#2c2418] truncate">{m.description}</div>
                  <div className="text-xs text-[#8b7355]">{m.cnt} visits, avg {fmt(m.avg_amt)}</div>
                </div>
                <div className="font-bold text-sm text-[#2c2418]">{fmt(m.total)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outliers */}
      {outliers.length > 0 && (
        <div className="glass rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#2c2418] mb-4 text-sm">Unusual Transactions (2.5x+ category average)</h3>
          <div className="space-y-2">
            {outliers.map((o, i) => (
              <div
                key={o.id}
                className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-200/30 animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔍</span>
                  <div>
                    <div className="text-sm font-medium text-[#2c2418]">{o.description}</div>
                    <div className="text-xs text-[#8b7355]">
                      {o.date} · {o.category} · avg for category: {fmt(o.cat_avg)}
                    </div>
                  </div>
                </div>
                <div className="font-bold text-red-600 text-sm">{fmt(o.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4 shadow-sm text-center">
      <div className="text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold text-[#2c2418] tracking-tight">{value}</div>
    </div>
  );
}

function InsightCard({ icon, title, value, subtitle }: { icon: string; title: string; value: string; subtitle: string }) {
  return (
    <div className="glass rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-semibold text-[#8b7355] uppercase tracking-wider">{title}</span>
      </div>
      <div className="text-lg font-bold text-[#2c2418]">{value}</div>
      <div className="text-xs text-[#8b7355] mt-0.5">{subtitle}</div>
    </div>
  );
}

function formatMonth(month: string) {
  if (!month) return "-";
  const [y, m] = month.split("-");
  const names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(m)]} ${y}`;
}
