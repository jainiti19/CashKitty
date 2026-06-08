"use client";

import { useState } from "react";
import TransactionForm from "@/components/TransactionForm";
import { useHelperName } from "@/components/AppShell";
import type { OcrResult } from "@/types";

export default function RecordExpensePage() {
  const helperName = useHelperName();
  const [ocrData, setOcrData] = useState<OcrResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
    } catch {
      alert("Failed to process invoice. You can enter details manually.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Record Expense</h2>

      <div className="glass rounded-2xl p-6 shadow-sm">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Upload Invoice (optional)
        </label>
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-emerald-400 transition-all cursor-pointer bg-gray-50/50 hover:bg-emerald-50/30">
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
              <div className="text-emerald-600">
                <div className="animate-spin inline-block w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full mb-3" />
                <p className="text-sm font-medium">Analyzing invoice...</p>
              </div>
            ) : previewUrl ? (
              <img src={previewUrl} alt="Invoice" className="max-h-48 mx-auto rounded-xl shadow-md" />
            ) : (
              <>
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">
                  📷
                </div>
                <p className="text-sm font-medium text-gray-600">Take a photo or upload an invoice</p>
                <p className="text-xs text-gray-400 mt-1">AI will auto-extract the details</p>
              </>
            )}
          </label>
        </div>

        {ocrData && (
          <div className="mt-4 px-4 py-3 bg-blue-50 rounded-xl text-xs text-blue-700 border border-blue-100">
            <span className="font-semibold">OCR confidence:</span> {ocrData.confidence}
            {ocrData.recommended_category && (
              <span> &middot; <span className="font-semibold">Category:</span> {ocrData.recommended_category}</span>
            )}
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-5 text-sm uppercase tracking-wider">
          {ocrData ? "Review & Edit Details" : "Enter Details"}
        </h3>
        <TransactionForm
          type="expense"
          helperName={helperName}
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
