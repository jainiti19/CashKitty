"use client";

import { useEffect, useState } from "react";
import type { Category, PaymentChannel } from "@/types";

interface TransactionFormProps {
  type: "income" | "expense";
  helperName: string;
  channelId?: number | null;
  initialData?: {
    amount?: number;
    description?: string;
    category_id?: number;
    date?: string;
  };
  onSuccess?: () => void;
  editMode?: { id: string };
}

export default function TransactionForm({ type, helperName, channelId: externalChannelId, initialData, onSuccess, editMode }: TransactionFormProps) {
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [categoryId, setCategoryId] = useState<number | "">(initialData?.category_id || "");
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split("T")[0]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [channelId, setChannelId] = useState<number | "">(externalChannelId || "");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "warning" } | null>(null);
  const [recommendedCategory, setRecommendedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories));
    fetch("/api/channels").then((r) => r.json()).then((d) => setChannels(d.channels));
  }, []);

  useEffect(() => {
    if (externalChannelId) setChannelId(externalChannelId);
  }, [externalChannelId]);

  useEffect(() => {
    if (initialData?.amount) setAmount(initialData.amount.toString());
    if (initialData?.description) setDescription(initialData.description);
    if (initialData?.category_id) setCategoryId(initialData.category_id);
    if (initialData?.date) setDate(initialData.date);
  }, [initialData]);

  useEffect(() => {
    if (type !== "expense" || !description || description.length < 3) return;
    const timeout = setTimeout(() => {
      fetch(`/api/categories/recommend?description=${encodeURIComponent(description)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.recommended) {
            setRecommendedCategory(d.recommended);
            if (!categoryId) {
              const match = categories.find((c) => c.name === d.recommended);
              if (match) setCategoryId(match.id);
            }
          }
        })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  }, [description, type, categories, categoryId]);

  const selectedChannel = channels.find((c) => c.id === channelId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const url = editMode ? `/api/transactions/${editMode.id}` : type === "income" ? "/api/kitty" : "/api/transactions";
    const method = editMode ? "PUT" : "POST";

    const body: Record<string, unknown> = {
      amount: parseFloat(amount),
      description: description || null,
      helper_name: helperName,
      date,
      channel_id: channelId || null,
    };

    if (type === "expense") {
      body.type = "expense";
      body.category_id = categoryId || null;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      const data = await res.json();

      if (data.limit_warning) {
        setMessage({ text: `Saved! Warning: ${data.limit_warning}`, type: "warning" });
      } else {
        setMessage({ text: editMode ? "Updated!" : "Saved!", type: "success" });
      }

      if (!editMode) {
        setAmount("");
        setDescription("");
        setCategoryId("");
      }
      onSuccess?.();
    } catch (err) {
      setMessage({ text: (err as Error).message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Channel selector */}
      {!externalChannelId && (
        <div>
          <label className="block text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-2">
            {type === "income" ? "Fund to" : "Pay via"}
          </label>
          <div className="flex gap-2 flex-wrap">
            {channels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChannelId(ch.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                  channelId === ch.id
                    ? "border-[#5c6b3c] bg-[#5c6b3c]/10 text-[#2c2418]"
                    : "border-[#d4c9b8]/50 text-[#8b7355] hover:border-[#d4c9b8]"
                }`}
              >
                <span>{ch.icon}</span>
                <span>{ch.name}</span>
              </button>
            ))}
          </div>
          {selectedChannel && type === "expense" && selectedChannel.monthly_limit && (
            <div className={`mt-2 text-xs px-3 py-1.5 rounded-lg ${
              (selectedChannel.remaining ?? 0) < 0
                ? "bg-red-50 text-red-600 border border-red-200"
                : "bg-[#f0ebe3] text-[#6b5740]"
            }`}>
              Monthly limit: {selectedChannel.monthly_limit} · Remaining: {Math.round(selectedChannel.remaining ?? 0)}
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-2">Amount</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-[#d4c9b8] rounded-xl text-lg font-semibold text-[#2c2418] focus:outline-none focus:ring-2 focus:ring-[#5c6b3c]/30 focus:border-[#5c6b3c] transition-all"
          placeholder="0.00"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-2">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-[#d4c9b8] rounded-xl text-[#2c2418] focus:outline-none focus:ring-2 focus:ring-[#5c6b3c]/30 focus:border-[#5c6b3c] transition-all"
          placeholder={type === "income" ? "e.g., Monthly top-up" : "e.g., Weekly grocery shopping"}
        />
      </div>

      {type === "expense" && (
        <div>
          <label className="block text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-2">
            Category
            {recommendedCategory && (
              <span className="ml-2 text-[#5c6b3c] normal-case font-medium tracking-normal">
                Suggested: {recommendedCategory}
              </span>
            )}
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : "")}
            className="w-full px-4 py-3 bg-white border border-[#d4c9b8] rounded-xl text-[#2c2418] focus:outline-none focus:ring-2 focus:ring-[#5c6b3c]/30 focus:border-[#5c6b3c] transition-all"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-2">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-[#d4c9b8] rounded-xl text-[#2c2418] focus:outline-none focus:ring-2 focus:ring-[#5c6b3c]/30 focus:border-[#5c6b3c] transition-all"
          required
        />
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === "success" ? "bg-[#5c6b3c]/10 text-[#5c6b3c] border border-[#5c6b3c]/20"
          : message.type === "warning" ? "bg-amber-50 text-amber-700 border border-amber-200"
          : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !amount}
        className="w-full bg-gradient-to-r from-[#5c6b3c] to-[#4a5630] text-white py-3.5 rounded-xl font-semibold hover:from-[#4a5630] hover:to-[#3d4828] disabled:opacity-40 transition-all shadow-lg shadow-[#5c6b3c]/25 active:scale-[0.98]"
      >
        {submitting ? "Saving..." : editMode ? "Update" : "Save"}
      </button>
    </form>
  );
}
