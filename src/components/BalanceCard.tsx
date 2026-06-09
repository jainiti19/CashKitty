"use client";

import { useEffect, useState } from "react";
import type { KittyBalance } from "@/types";
import { fmt } from "@/lib/config";

export default function BalanceCard() {
  const [data, setData] = useState<KittyBalance | null>(null);
  const [showChannels, setShowChannels] = useState(false);

  useEffect(() => {
    fetch("/api/kitty")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse bg-[#d4c9b8]/30 rounded-2xl h-24" />
        <div className="grid grid-cols-2 gap-3">
          <div className="animate-pulse bg-[#d4c9b8]/30 rounded-2xl h-20" />
          <div className="animate-pulse bg-[#d4c9b8]/30 rounded-2xl h-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
        <div className="bg-gradient-to-br from-[#5c6b3c] to-[#4a5630] rounded-2xl p-4 md:p-5 shadow-lg shadow-[#5c6b3c]/20 text-white">
          <div className="text-xs md:text-sm font-medium text-[#c8d4a9] mb-1">Balance</div>
          <div className="text-2xl md:text-3xl font-bold tracking-tight">{fmt(data.balance)}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:contents">
          <div className="glass rounded-2xl p-4 md:p-5 shadow-sm">
            <div className="text-xs md:text-sm font-medium text-[#8b7355] mb-1">Total Added</div>
            <div className="text-lg md:text-2xl font-bold text-[#5c6b3c] tracking-tight">{fmt(data.total_income)}</div>
          </div>
          <div className="glass rounded-2xl p-4 md:p-5 shadow-sm">
            <div className="text-xs md:text-sm font-medium text-[#8b7355] mb-1">Total Spent</div>
            <div className="text-lg md:text-2xl font-bold text-[#96623c] tracking-tight">{fmt(data.total_expense)}</div>
          </div>
        </div>
      </div>

      {/* Channel breakdown */}
      {data.by_channel && data.by_channel.length > 0 && (
        <>
          <button
            onClick={() => setShowChannels(!showChannels)}
            className="text-xs font-medium text-[#8b7355] hover:text-[#6b5740] transition-colors flex items-center gap-1"
          >
            <span className={`transition-transform ${showChannels ? "rotate-90" : ""}`}>▶</span>
            {showChannels ? "Hide" : "Show"} channels ({data.by_channel.length})
          </button>
          {showChannels && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 animate-fade-in">
              {data.by_channel.map((ch) => (
                <div key={ch.id} className="glass rounded-xl p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{ch.icon}</span>
                    <span className="text-xs font-semibold text-[#2c2418]">{ch.name}</span>
                  </div>
                  <div className="text-sm font-bold text-[#2c2418]">{fmt(ch.remaining ?? 0)}</div>
                  <div className="text-[10px] text-[#8b7355]">
                    {ch.monthly_limit ? `Limit: ${fmt(ch.monthly_limit)}` : `In: ${fmt(ch.funded ?? 0)} · Out: ${fmt(ch.spent ?? 0)}`}
                  </div>
                  {ch.monthly_limit && (
                    <div className="mt-1.5 h-1.5 bg-[#d4c9b8]/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (ch.spent ?? 0) > ch.monthly_limit ? "bg-red-500" : "bg-[#5c6b3c]"
                        }`}
                        style={{ width: `${Math.min(100, ((ch.spent ?? 0) / ch.monthly_limit) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
