"use client";

import { useEffect, useState } from "react";
import { useUserInfo } from "@/components/AppShell";
import { fmt } from "@/lib/config";
import type { User, SalaryPayment, Loan } from "@/types";

export default function SalaryPage() {
  const { token, role, id: myId } = useUserInfo();
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [genMonth, setGenMonth] = useState(new Date().toISOString().slice(0, 7));
  const [genBonus, setGenBonus] = useState("");
  const [genDeduction, setGenDeduction] = useState("");
  const [newLoan, setNewLoan] = useState({ amount: "", emi: "", reason: "" });
  const [message, setMessage] = useState("");

  const isEmployer = role === "employer";

  useEffect(() => {
    if (isEmployer) {
      fetch("/api/users", { headers }).then((r) => r.json()).then((d) => {
        const helpers = (d.users || []).filter((u: User) => u.role === "helper" && u.active);
        setUsers(helpers);
        if (helpers.length > 0) setSelectedUser(helpers[0].id);
      });
    } else {
      setSelectedUser(myId);
    }
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    fetch(`/api/salary?user_id=${selectedUser}`, { headers }).then((r) => r.json()).then((d) => setPayments(d.payments || []));
    fetch(`/api/loans?user_id=${selectedUser}`, { headers }).then((r) => r.json()).then((d) => setLoans(d.loans || []));
  }, [selectedUser]);

  async function generateSalary(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/salary/generate", {
      method: "POST", headers,
      body: JSON.stringify({ user_id: selectedUser, month: genMonth, bonus: parseFloat(genBonus) || 0, other_deduction: parseFloat(genDeduction) || 0 }),
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error); return; }
    setMessage("Salary generated!");
    setGenBonus(""); setGenDeduction("");
    fetch(`/api/salary?user_id=${selectedUser}`, { headers }).then((r) => r.json()).then((d) => setPayments(d.payments || []));
  }

  async function paySalary(paymentId: number) {
    await fetch(`/api/salary/${paymentId}/pay`, { method: "POST", headers });
    fetch(`/api/salary?user_id=${selectedUser}`, { headers }).then((r) => r.json()).then((d) => setPayments(d.payments || []));
    fetch(`/api/loans?user_id=${selectedUser}`, { headers }).then((r) => r.json()).then((d) => setLoans(d.loans || []));
  }

  async function addLoan(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/loans", {
      method: "POST", headers,
      body: JSON.stringify({ user_id: selectedUser, amount: parseFloat(newLoan.amount), emi: parseFloat(newLoan.emi), reason: newLoan.reason }),
    });
    setNewLoan({ amount: "", emi: "", reason: "" });
    fetch(`/api/loans?user_id=${selectedUser}`, { headers }).then((r) => r.json()).then((d) => setLoans(d.loans || []));
  }

  const activeLoans = loans.filter((l) => l.status === "active");
  const totalLoanBalance = activeLoans.reduce((s, l) => s + l.balance, 0);
  const selectedUserData = users.find((u) => u.id === selectedUser);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-[#2c2418] tracking-tight">
        {role === "helper" ? "My Salary" : "Salary & Loans"}
      </h2>

      {/* Helper selector (employer only) */}
      {isEmployer && users.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUser(u.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                selectedUser === u.id
                  ? "border-[#5c6b3c] bg-[#5c6b3c]/10 text-[#2c2418]"
                  : "border-[#d4c9b8]/50 text-[#8b7355]"
              }`}
            >
              {u.name} {u.salary ? `· ${fmt(u.salary)}/mo` : ""}
            </button>
          ))}
        </div>
      )}

      {selectedUser && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="glass rounded-2xl p-4 shadow-sm text-center">
              <div className="text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Monthly Salary</div>
              <div className="text-xl font-bold text-[#5c6b3c]">{fmt(selectedUserData?.salary || 0)}</div>
            </div>
            <div className="glass rounded-2xl p-4 shadow-sm text-center">
              <div className="text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Active Loans</div>
              <div className="text-xl font-bold text-[#96623c]">{activeLoans.length}</div>
            </div>
            <div className="glass rounded-2xl p-4 shadow-sm text-center">
              <div className="text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Loan Balance</div>
              <div className="text-xl font-bold text-[#96623c]">{fmt(totalLoanBalance)}</div>
            </div>
          </div>

          {/* Generate salary (employer only) */}
          {isEmployer && (
            <form onSubmit={generateSalary} className="glass rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-[#2c2418] text-sm">Generate Salary Slip</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#8b7355] mb-1">Month</label>
                  <input type="month" value={genMonth} onChange={(e) => setGenMonth(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-[#8b7355] mb-1">Bonus</label>
                  <input type="number" value={genBonus} onChange={(e) => setGenBonus(e.target.value)} placeholder="0" className="w-full px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-[#8b7355] mb-1">Other Deduction</label>
                  <input type="number" value={genDeduction} onChange={(e) => setGenDeduction(e.target.value)} placeholder="0" className="w-full px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" />
                </div>
              </div>
              {message && <div className="text-xs text-[#5c6b3c] font-medium">{message}</div>}
              <button type="submit" className="px-5 py-2 bg-gradient-to-r from-[#5c6b3c] to-[#4a5630] text-white rounded-xl text-sm font-semibold shadow-md active:scale-[0.98]">
                Generate
              </button>
            </form>
          )}

          {/* Salary history */}
          <div className="glass rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#d4c9b8]/30">
              <h3 className="font-bold text-[#2c2418] text-sm">Salary History</h3>
            </div>
            {payments.length === 0 ? (
              <div className="p-8 text-center text-[#8b7355]">No salary payments yet.</div>
            ) : (
              <div className="divide-y divide-[#d4c9b8]/20">
                {payments.map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-[#2c2418]">{p.month}</div>
                      <div className="text-xs text-[#8b7355]">
                        Base: {fmt(p.base_salary)}
                        {p.loan_deduction > 0 && ` · Loan: -${fmt(p.loan_deduction)}`}
                        {p.other_deduction > 0 && ` · Other: -${fmt(p.other_deduction)}`}
                        {p.bonus > 0 && ` · Bonus: +${fmt(p.bonus)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#2c2418]">{fmt(p.net_paid)}</div>
                        <div className={`text-xs font-medium ${p.status === "paid" ? "text-[#5c6b3c]" : "text-[#96623c]"}`}>
                          {p.status === "paid" ? `Paid ${p.paid_date || ""}` : "Pending"}
                        </div>
                      </div>
                      {isEmployer && p.status === "pending" && (
                        <button onClick={() => paySalary(p.id)} className="px-3 py-1.5 bg-[#5c6b3c] text-white rounded-lg text-xs font-semibold">
                          Pay
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loans */}
          <div className="glass rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#d4c9b8]/30">
              <h3 className="font-bold text-[#2c2418] text-sm">Loans</h3>
            </div>
            {loans.length === 0 ? (
              <div className="p-8 text-center text-[#8b7355]">No loans.</div>
            ) : (
              <div className="divide-y divide-[#d4c9b8]/20">
                {loans.map((l) => (
                  <div key={l.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-[#2c2418]">{l.reason || "Loan"}</div>
                      <div className="text-xs text-[#8b7355]">
                        Amount: {fmt(l.amount)} · EMI: {fmt(l.emi)}/mo · Remaining: {fmt(l.balance)}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                      l.status === "active" ? "bg-[#96623c]/10 text-[#96623c]" : "bg-[#5c6b3c]/10 text-[#5c6b3c]"
                    }`}>
                      {l.status === "active" ? "Active" : "Paid Off"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add loan (employer only) */}
          {isEmployer && (
            <form onSubmit={addLoan} className="glass rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-[#2c2418] text-sm">Add Loan</h3>
              <div className="grid grid-cols-3 gap-3">
                <input type="number" value={newLoan.amount} onChange={(e) => setNewLoan({ ...newLoan, amount: e.target.value })} placeholder="Amount" className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" required />
                <input type="number" value={newLoan.emi} onChange={(e) => setNewLoan({ ...newLoan, emi: e.target.value })} placeholder="Monthly EMI" className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" required />
                <input value={newLoan.reason} onChange={(e) => setNewLoan({ ...newLoan, reason: e.target.value })} placeholder="Reason" className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" />
              </div>
              <button type="submit" className="px-5 py-2 bg-gradient-to-r from-[#96623c] to-[#7d5132] text-white rounded-xl text-sm font-semibold shadow-md active:scale-[0.98]">
                Add Loan
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
