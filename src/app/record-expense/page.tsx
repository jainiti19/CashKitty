"use client";

import { useState, useEffect } from "react";
import TransactionForm from "@/components/TransactionForm";
import { useHelperName } from "@/components/AppShell";
import type { OcrResult, PaymentChannel } from "@/types";

export default function RecordExpensePage() {
  const helperName = useHelperName();
  const [ocrData, setOcrData] = useState<(OcrResult & { source_type?: string; wallet_name?: string }) | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/channels").then((r) => r.json()).then((d) => setChannels(d.channels));
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      if (!res.ok) throw new Error("OCR failed");
      const data = await res.json();
      setOcrData(data);

      // Auto-select channel if wallet detected
      if (data.wallet_name && data.source_type === "wallet_statement") {
        const match = channels.find((c) =>
          c.name.toLowerCase().includes(data.wallet_name.toLowerCase()) ||
          data.wallet_name.toLowerCase().includes(c.name.toLowerCase())
        );
        if (match) setSelectedChannel(match.id);
      }
    } catch {
      alert("Failed to process image. You can enter details manually.");
    } finally {
      setUploading(false);
    }
  }

  const isCash = selectedChannel ? channels.find((c) => c.id === selectedChannel)?.type === "cash" : true;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-[#2c2418] tracking-tight">Record Expense</h2>

      {/* Payment method selector */}
      <div className="glass rounded-2xl p-5 shadow-sm">
        <label className="block text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-3">
          Payment Method
        </label>
        <div className="flex gap-2 flex-wrap">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChannel(ch.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                selectedChannel === ch.id
                  ? "border-[#5c6b3c] bg-[#5c6b3c]/10 text-[#2c2418]"
                  : "border-[#d4c9b8]/50 text-[#8b7355] hover:border-[#d4c9b8]"
              }`}
            >
              <span>{ch.icon}</span>
              <span>{ch.name}</span>
            </button>
          ))}
        </div>
        {selectedChannel && (() => {
          const ch = channels.find((c) => c.id === selectedChannel);
          if (!ch || !ch.monthly_limit) return null;
          return (
            <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${
              (ch.remaining ?? 0) < 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-[#f0ebe3] text-[#6b5740]"
            }`}>
              Monthly limit: {ch.monthly_limit} · Spent: {Math.round(ch.spent ?? 0)} · Remaining: {Math.round(ch.remaining ?? 0)}
            </div>
          );
        })()}
      </div>

      {/* Upload area */}
      <div className="glass rounded-2xl p-6 shadow-sm">
        <label className="block text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-3">
          {isCash ? "Upload Invoice (optional)" : "Upload Invoice or Wallet Statement (optional)"}
        </label>
        <div className="border-2 border-dashed border-[#d4c9b8]/60 rounded-2xl p-8 text-center hover:border-[#5c6b3c]/40 transition-all cursor-pointer bg-white/30">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
            id="invoice-upload"
          />
          <label htmlFor="invoice-upload" className="cursor-pointer">
            {uploading ? (
              <div className="text-[#5c6b3c]">
                <div className="animate-spin inline-block w-10 h-10 border-4 border-[#d4c9b8] border-t-[#5c6b3c] rounded-full mb-3" />
                <p className="text-sm font-medium">Analyzing image...</p>
              </div>
            ) : previewUrl ? (
              <img src={previewUrl} alt="Upload" className="max-h-48 mx-auto rounded-xl shadow-md" />
            ) : (
              <>
                <div className="w-14 h-14 bg-[#5c6b3c]/10 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">
                  {isCash ? "📷" : "📱"}
                </div>
                <p className="text-sm font-medium text-[#6b5740]">
                  {isCash ? "Take a photo or upload an invoice" : "Upload invoice or wallet screenshot"}
                </p>
                <p className="text-xs text-[#8b7355] mt-1">AI will auto-extract the details</p>
              </>
            )}
          </label>
        </div>

        {ocrData && (
          <div className="mt-4 px-4 py-3 bg-[#5c6b3c]/5 rounded-xl text-xs border border-[#5c6b3c]/15">
            <span className="font-semibold text-[#5c6b3c]">AI detected:</span>{" "}
            <span className="text-[#6b5740]">
              {ocrData.source_type === "wallet_statement" ? `Wallet statement (${ocrData.wallet_name || "unknown"})` : "Invoice/Receipt"}
              {" · "}Confidence: {ocrData.confidence}
            </span>
          </div>
        )}
      </div>

      {/* Expense form */}
      <div className="glass rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#2c2418] mb-5 text-sm uppercase tracking-wider">
          {ocrData ? "Review & Edit Details" : "Enter Details"}
        </h3>
        <TransactionForm
          type="expense"
          helperName={helperName}
          channelId={selectedChannel}
          initialData={
            ocrData
              ? {
                  amount: ocrData.amount || undefined,
                  description: ocrData.description || undefined,
                  date: ocrData.date || undefined,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
