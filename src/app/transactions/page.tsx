"use client";

import { useEffect, useState, useMemo } from "react";
import type { Transaction, Category } from "@/types";
import CategoryBadge from "@/components/CategoryBadge";
import { useHelperName } from "@/components/AppShell";
import { format } from "date-fns";
import { fmt } from "@/lib/config";

type GroupBy = "none" | "category" | "month" | "date";
type SortBy = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export default function TransactionsPage() {
  const helperName = useHelperName();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sortBy, setSortBy] = useState<SortBy>("date-desc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Transaction>>({});

  function loadTransactions() {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    params.set("limit", "200");
    fetch(`/api/transactions?${params}`)
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions));
  }

  useEffect(() => {
    loadTransactions();
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories));
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filterType]);

  const sortedTransactions = useMemo(() => {
    let filtered = [...transactions];
    if (filterCategory) {
      filtered = filtered.filter((t) => t.category_name === filterCategory);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-asc": return a.date.localeCompare(b.date);
        case "date-desc": return b.date.localeCompare(a.date);
        case "amount-asc": return a.amount - b.amount;
        case "amount-desc": return b.amount - a.amount;
      }
    });
    return filtered;
  }, [transactions, sortBy, filterCategory]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return { "All Transactions": sortedTransactions };

    const groups: Record<string, Transaction[]> = {};
    for (const t of sortedTransactions) {
      let key: string;
      switch (groupBy) {
        case "category":
          key = t.category_name || "Uncategorized";
          break;
        case "month":
          key = format(new Date(t.date), "MMMM yyyy");
          break;
        case "date":
          key = format(new Date(t.date), "dd MMMM yyyy");
          break;
        default:
          key = "All";
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    return groups;
  }, [sortedTransactions, groupBy]);

  function startEdit(t: Transaction) {
    setEditingId(t.id);
    setEditData({ amount: t.amount, description: t.description, category_id: t.category_id, date: t.date });
  }

  async function saveEdit(id: string) {
    await fetch(`/api/transactions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editData, helper_name: helperName }),
    });
    setEditingId(null);
    loadTransactions();
  }

  async function deleteTransaction(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    loadTransactions();
  }

  function groupTotal(txns: Transaction[]) {
    const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  }

  const uniqueCategories = [...new Set(transactions.map((t) => t.category_name).filter(Boolean))];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>

      {/* Filters & Controls */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All categories</option>
              {uniqueCategories.map((c) => <option key={c} value={c!}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Group by</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="none">No grouping</option>
              <option value="category">Category</option>
              <option value="month">Month</option>
              <option value="date">Date</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sort by</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="date-desc">Date (newest)</option>
              <option value="date-asc">Date (oldest)</option>
              <option value="amount-desc">Amount (highest)</option>
              <option value="amount-asc">Amount (lowest)</option>
            </select>
          </div>
          {(filterType || filterCategory || groupBy !== "none" || sortBy !== "date-desc") && (
            <div className="self-end">
              <button
                onClick={() => { setFilterType(""); setFilterCategory(""); setGroupBy("none"); setSortBy("date-desc"); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Reset all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grouped Transactions */}
      {Object.entries(grouped).map(([groupName, txns]) => {
        const totals = groupTotal(txns);
        return (
          <div key={groupName} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {groupBy !== "none" && (
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{groupName}</h3>
                <div className="flex gap-4 text-sm">
                  {totals.income > 0 && (
                    <span className="text-emerald-600">+{fmt(totals.income)}</span>
                  )}
                  {totals.expense > 0 && (
                    <span className="text-orange-600">-{fmt(totals.expense)}</span>
                  )}
                  <span className="font-medium text-gray-700">
                    {txns.length} txn{txns.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}
            {txns.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No transactions found.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Helper</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {txns.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      {editingId === t.id ? (
                        <>
                          <td className="px-4 py-2">
                            <input type="date" value={editData.date || ""} onChange={(e) => setEditData({ ...editData, date: e.target.value })} className="px-2 py-1 border rounded text-sm w-full" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="text" value={editData.description || ""} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="px-2 py-1 border rounded text-sm w-full" />
                          </td>
                          <td className="px-4 py-2">
                            <select value={editData.category_id || ""} onChange={(e) => setEditData({ ...editData, category_id: e.target.value ? parseInt(e.target.value) : null })} className="px-2 py-1 border rounded text-sm">
                              <option value="">None</option>
                              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">{t.helper_name}</td>
                          <td className="px-4 py-2">
                            <input type="number" step="0.01" value={editData.amount || ""} onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })} className="px-2 py-1 border rounded text-sm w-24 text-right" />
                          </td>
                          <td className="px-4 py-2 flex gap-1">
                            <button onClick={() => saveEdit(t.id)} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs">Save</button>
                            <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-gray-300 rounded text-xs">Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm">{format(new Date(t.date), "dd MMM yyyy")}</td>
                          <td className="px-4 py-3 text-sm">{t.description || "-"}</td>
                          <td className="px-4 py-3"><CategoryBadge name={t.category_name} color={t.category_color} /></td>
                          <td className="px-4 py-3 text-sm text-gray-600">{t.helper_name}</td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${t.type === "income" ? "text-emerald-600" : "text-orange-600"}`}>
                            {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                          </td>
                          <td className="px-4 py-3 flex gap-1">
                            <button onClick={() => startEdit(t)} className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs">Edit</button>
                            <button onClick={() => deleteTransaction(t.id)} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs">Delete</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
