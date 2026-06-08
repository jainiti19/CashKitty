"use client";

import { useState } from "react";
import Image from "next/image";

interface HelperNamePromptProps {
  onSubmit: (name: string, role: string) => void;
}

const roles = [
  { value: "helper", label: "Helper", description: "Maid, cook, driver, etc.", icon: "👤" },
  { value: "employer", label: "Employer", description: "Household owner", icon: "🏠" },
  { value: "family", label: "Family Member", description: "Spouse, parent, etc.", icon: "👨‍👩‍👧" },
];

export default function HelperNamePrompt({ onSubmit }: HelperNamePromptProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("helper");

  return (
    <div className="fixed inset-0 bg-[#2c2418]/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#f5f3ef] rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 animate-fade-in">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="CashKitty" width={72} height={72} className="mx-auto mb-4 rounded-2xl shadow-lg" />
          <h1 className="text-2xl font-bold text-[#2c2418] tracking-tight">Welcome to CashKitty</h1>
          <p className="text-[#8b7355] mt-1 text-sm">Enter your details to continue</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onSubmit(name.trim(), role);
          }}
        >
          <div className="mb-5">
            <label className="block text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-2">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-white border border-[#d4c9b8] rounded-xl text-base text-[#2c2418] focus:outline-none focus:ring-2 focus:ring-[#5c6b3c]/30 focus:border-[#5c6b3c] transition-all"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-2">Your Role</label>
            <div className="space-y-2">
              {roles.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    role === r.value
                      ? "border-[#5c6b3c] bg-[#5c6b3c]/5"
                      : "border-[#d4c9b8]/60 hover:border-[#d4c9b8] bg-white"
                  }`}
                >
                  <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={(e) => setRole(e.target.value)} className="hidden" />
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors ${
                    role === r.value ? "bg-[#5c6b3c]/15" : "bg-[#f0ebe3]"
                  }`}>
                    {r.icon}
                  </div>
                  <div>
                    <div className={`text-sm font-semibold ${role === r.value ? "text-[#5c6b3c]" : "text-[#2c2418]"}`}>{r.label}</div>
                    <div className="text-xs text-[#8b7355]">{r.description}</div>
                  </div>
                  {role === r.value && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-[#5c6b3c] flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-gradient-to-r from-[#5c6b3c] to-[#4a5630] text-white py-3.5 rounded-xl font-semibold hover:from-[#4a5630] hover:to-[#3d4828] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#5c6b3c]/25 active:scale-[0.98]"
          >
            Start Session
          </button>
        </form>
      </div>
    </div>
  );
}
