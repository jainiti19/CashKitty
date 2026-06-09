"use client";

import { useEffect, useState } from "react";
import type { Alert } from "@/types";

type FilterType = "" | "category_deviation" | "upward_trend" | "invoice_mismatch";

const typeLabels: Record<string, string> = {
  category_deviation: "Category Spike",
  upward_trend: "Upward Trend",
  invoice_mismatch: "Invoice Mismatch",
};

const typeIcons: Record<string, string> = {
  category_deviation: "📊",
  upward_trend: "📈",
  invoice_mismatch: "🧾",
};

const severityStyles: Record<string, string> = {
  high: "bg-red-50 border-red-200 text-red-800",
  medium: "bg-amber-50 border-amber-200 text-amber-800",
  low: "bg-[#f0ebe3] border-[#d4c9b8] text-[#6b5740]",
};

const severityBadgeStyles: Record<string, string> = {
  high: "bg-red-500 text-white",
  medium: "bg-amber-500 text-white",
  low: "bg-[#8b7355] text-white",
};

function renderWeeklyTotals(alert: Alert) {
  if (alert.type !== "upward_trend" || !alert.details) return null;
  const details = alert.details as { weekly_totals?: { week: string; total: number }[] };
  if (!details.weekly_totals) return null;
  return (
    <div className="flex gap-2 mt-2">
      {details.weekly_totals.map((w) => (
        <div key={w.week} className="text-xs px-2 py-1 rounded-lg bg-white/50">
          <div className="font-mono opacity-60">{w.week}</div>
          <div className="font-bold">{w.total}</div>
        </div>
      ))}
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState({ total: 0, high: 0, medium: 0, low: 0 });
  const [filterType, setFilterType] = useState<FilterType>("");
  const [loading, setLoading] = useState(true);

  function loadAlerts() {
    setLoading(true);
    fetch("/api/reports/alerts")
      .then((r) => r.json())
      .then((d) => {
        setAlerts(d.alerts);
        setSummary(d.summary);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  async function dismissAlert(id: number) {
    await fetch("/api/reports/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolved: true }),
    });
    loadAlerts();
  }

  const filtered = filterType ? alerts.filter((a) => a.type === filterType) : alerts;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-[#2c2418] tracking-tight">Alerts & Anomalies</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="glass rounded-2xl p-4 text-center shadow-sm">
          <div className="text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Total</div>
          <div className="text-3xl font-bold text-[#2c2418]">{summary.total}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">High</div>
          <div className="text-3xl font-bold text-red-600">{summary.high}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Medium</div>
          <div className="text-3xl font-bold text-amber-600">{summary.medium}</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center shadow-sm">
          <div className="text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Low</div>
          <div className="text-3xl font-bold text-[#6b5740]">{summary.low}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["", "category_deviation", "upward_trend", "invoice_mismatch"] as FilterType[]).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filterType === t
                ? "bg-[#5c6b3c] text-white shadow-sm"
                : "glass text-[#6b5740] hover:bg-white/80"
            }`}
          >
            {t ? typeLabels[t] : "All"}
          </button>
        ))}
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center text-[#8b7355]">Analyzing transactions...</div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="text-3xl mb-3">✅</div>
          <div className="font-semibold text-[#2c2418]">No anomalies detected</div>
          <div className="text-sm text-[#8b7355] mt-1">All transactions look normal</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert, i) => (
            <div
              key={alert.id}
              className={`rounded-2xl p-5 border ${severityStyles[alert.severity]} animate-fade-in`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{typeIcons[alert.type]}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${severityBadgeStyles[alert.severity]}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs font-medium opacity-60">{typeLabels[alert.type]}</span>
                    </div>
                    <div className="font-semibold text-sm mb-1">{alert.message}</div>
                    {alert.recommendation && (
                      <div className="text-xs italic opacity-70 mt-1">{alert.recommendation}</div>
                    )}
                    {renderWeeklyTotals(alert)}
                  </div>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/50 hover:bg-white/80 transition-colors shrink-0"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
