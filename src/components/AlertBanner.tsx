"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AlertBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/reports/alerts/count")
      .then((r) => r.json())
      .then((d) => setCount(d.count));
  }, []);

  if (count === 0) return null;

  return (
    <Link
      href="/alerts"
      className="block bg-gradient-to-r from-[#96623c]/10 to-red-500/10 border border-red-300/40 rounded-2xl p-4 hover:border-red-400/60 transition-all group"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <div className="font-semibold text-[#2c2418]">
            {count} Alert{count > 1 ? "s" : ""} Detected
          </div>
          <div className="text-sm text-[#8b7355]">
            Review spending anomalies and flagged transactions
          </div>
        </div>
        <span className="ml-auto text-[#96623c] group-hover:translate-x-1 transition-transform">→</span>
      </div>
    </Link>
  );
}
