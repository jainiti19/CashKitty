"use client";

import Image from "next/image";

interface LandingPageProps {
  onGetStarted: () => void;
}

const menuOptions = [
  { label: "Add Money", icon: "💰", description: "Top up the cash kitty", color: "from-[#5c6b3c] to-[#4a5630]" },
  { label: "Record Expense", icon: "🧾", description: "Snap a receipt or enter manually", color: "from-[#96623c] to-[#7d5132]" },
  { label: "View Transactions", icon: "📋", description: "See all transactions & edit", color: "from-[#6b5740] to-[#5a4935]" },
  { label: "Daily Report", icon: "📅", description: "Today's income & expense summary", color: "from-[#7a8a56] to-[#5c6b3c]" },
  { label: "Trends & Insights", icon: "📈", description: "Charts & spending patterns", color: "from-[#8b7355] to-[#6b5740]" },
  { label: "Manage Categories", icon: "🏷️", description: "Add, edit, or remove categories", color: "from-[#a69279] to-[#8b7355]" },
];

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f3ef] via-[#f0ebe3] to-[#e8e0d4]">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="mb-8 animate-fade-in">
          <Image src="/logo.png" alt="CashKitty" width={130} height={130} className="mx-auto rounded-3xl shadow-2xl shadow-[#8b7355]/25" />
        </div>
        <h1 className="text-5xl font-extrabold text-[#2c2418] mb-2 tracking-tight animate-fade-in">
          CashKitty
        </h1>
        <p className="text-lg font-semibold gradient-text mb-8 animate-fade-in">
          Your Household Cash, Perfectly Tracked
        </p>

        <div className="bg-white/60 backdrop-blur-sm border border-[#d4c9b8]/40 rounded-3xl p-8 text-left max-w-2xl mx-auto mb-10 animate-fade-in">
          <h2 className="text-lg font-bold text-[#2c2418] mb-4 text-center tracking-tight">What is CashKitty?</h2>
          <p className="text-[#6b5740] mb-3 leading-relaxed text-sm">
            CashKitty is a simple app to manage your household cash kitty on a daily basis.
            It helps you track when you add money and when and how it gets spent by your
            household helpers — maids, cooks, drivers, or anyone who handles daily expenses on your behalf.
          </p>
          <p className="text-[#6b5740] mb-3 leading-relaxed text-sm">
            Helpers can snap a photo of any receipt or invoice, and CashKitty&apos;s AI will
            automatically extract the date, amount, and purpose. No more manually noting down
            every expense or losing track of bills.
          </p>
          <p className="text-[#6b5740] leading-relaxed text-sm">
            With smart categories, daily reports, and spending trend analysis, you always know
            exactly where your money is going — down to the last dollar.
          </p>
        </div>

        {/* Key highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto mb-10">
          {[
            { icon: "📸", text: "AI Receipt Scanning" },
            { icon: "📊", text: "Daily Reports" },
            { icon: "🏷️", text: "Smart Categories" },
            { icon: "👥", text: "Multi-Helper Support" },
          ].map((h, i) => (
            <div key={h.text} className="bg-white/50 backdrop-blur-sm border border-[#d4c9b8]/30 rounded-2xl p-4 text-center animate-fade-in shadow-sm" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="text-2xl mb-1">{h.icon}</div>
              <div className="text-xs font-semibold text-[#6b5740]">{h.text}</div>
            </div>
          ))}
        </div>

        <button
          onClick={onGetStarted}
          className="bg-gradient-to-r from-[#5c6b3c] to-[#4a5630] text-white px-10 py-4 rounded-2xl text-lg font-bold hover:from-[#4a5630] hover:to-[#3d4828] transition-all shadow-xl shadow-[#5c6b3c]/25 active:scale-[0.97] animate-fade-in"
        >
          Enter CashKitty
        </button>
      </section>

      {/* Menu Options */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-xl font-bold text-center text-[#2c2418] mb-8 tracking-tight">
          What you can do
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {menuOptions.map((item, i) => (
            <button
              key={item.label}
              onClick={onGetStarted}
              className="bg-white/50 backdrop-blur-sm border border-[#d4c9b8]/30 rounded-2xl p-5 shadow-sm hover:shadow-md hover:bg-white/70 transition-all text-left group active:scale-[0.98] animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center text-lg text-white shadow-sm`}>
                  {item.icon}
                </div>
                <h3 className="font-bold text-[#2c2418] group-hover:text-[#5c6b3c] transition-colors text-sm">
                  {item.label}
                </h3>
              </div>
              <p className="text-xs text-[#8b7355] leading-relaxed">{item.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#d4c9b8]/40 py-6 text-center text-xs text-[#8b7355]">
        <div className="flex items-center justify-center gap-2">
          <Image src="/logo.png" alt="CashKitty" width={18} height={18} className="rounded opacity-60" />
          <span>CashKitty — Track every dollar, effortlessly.</span>
        </div>
      </footer>
    </div>
  );
}
