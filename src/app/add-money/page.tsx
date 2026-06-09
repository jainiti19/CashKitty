"use client";

import TransactionForm from "@/components/TransactionForm";
import BalanceCard from "@/components/BalanceCard";
import { useHelperName } from "@/components/AppShell";
import { useState } from "react";

export default function AddMoneyPage() {
  const helperName = useHelperName();
  const [key, setKey] = useState(0);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-[#2c2418] tracking-tight">Add Money to Kitty</h2>

      <BalanceCard key={key} />

      <div className="glass rounded-2xl p-6 shadow-sm">
        <TransactionForm
          type="income"
          helperName={helperName}
          onSuccess={() => setKey((k) => k + 1)}
        />
      </div>
    </div>
  );
}
