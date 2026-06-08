"use client";

import { useEffect, useState } from "react";
import type { KittyBalance } from "@/types";
import { fmt } from "@/lib/config";

export default function BalanceCard() {
  const [data, setData] = useState<KittyBalance | null>(null);

  useEffect(() => {
    fetch("/api/kitty")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse bg-[#d4c9b8]/30 rounded-2xl h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-gradient-to-br from-[#5c6b3c] to-[#4a5630] rounded-2xl p-5 shadow-lg shadow-[#5c6b3c]/20 text-white">
        <div className="text-sm font-medium text-[#c8d4a9] mb-1">Balance</div>
        <div className="text-3xl font-bold tracking-tight">{fmt(data.balance)}</div>
      </div>
      <div className="glass rounded-2xl p-5 shadow-sm">
        <div className="text-sm font-medium text-[#8b7355] mb-1">Total Added</div>
        <div className="text-2xl font-bold text-[#5c6b3c] tracking-tight">{fmt(data.total_income)}</div>
      </div>
      <div className="glass rounded-2xl p-5 shadow-sm">
        <div className="text-sm font-medium text-[#8b7355] mb-1">Total Spent</div>
        <div className="text-2xl font-bold text-[#96623c] tracking-tight">{fmt(data.total_expense)}</div>
      </div>
    </div>
  );
}
