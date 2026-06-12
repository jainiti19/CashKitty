"use client";

import { useEffect, useState } from "react";
import { useUserInfo } from "@/components/AppShell";
import type { User, PaymentChannel, Category } from "@/types";
import { fmt } from "@/lib/config";

type Tab = "users" | "currency" | "categories" | "channels";

export default function AdminPage() {
  const { token, role } = useUserInfo();
  const [tab, setTab] = useState<Tab>("users");

  if (role !== "employer") {
    return <div className="max-w-4xl mx-auto p-8 text-center text-[#8b7355]">Access denied. Employer only.</div>;
  }

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-[#2c2418] tracking-tight">Admin Panel</h2>

      <div className="flex gap-1 bg-[#d4c9b8]/30 p-1 rounded-xl w-fit flex-wrap">
        {(["users", "currency", "categories", "channels"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? "bg-white text-[#2c2418] shadow-sm" : "text-[#8b7355]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab headers={headers} />}
      {tab === "currency" && <CurrencyTab headers={headers} />}
      {tab === "categories" && <CategoriesTab headers={headers} />}
      {tab === "channels" && <ChannelsTab headers={headers} />}
    </div>
  );
}

function UsersTab({ headers }: { headers: Record<string, string> }) {
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ name: "", role: "helper", password: "", salary: "", phone: "" });

  function load() {
    fetch("/api/users", { headers }).then((r) => r.json()).then((d) => setUsers(d.users || []));
  }
  useEffect(() => { load(); }, []);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/users", {
      method: "POST", headers,
      body: JSON.stringify({ ...newUser, salary: newUser.salary ? parseFloat(newUser.salary) : null, phone: newUser.phone || null }),
    });
    setNewUser({ name: "", role: "helper", password: "", salary: "", phone: "" });
    load();
  }

  async function toggleActive(id: number, active: boolean) {
    await fetch(`/api/users/${id}`, {
      method: "PUT", headers,
      body: JSON.stringify({ active: !active }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addUser} className="glass rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-[#2c2418] text-sm">Add User</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Name" className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" required />
          <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm">
            <option value="helper">Helper</option>
            <option value="employer">Employer</option>
            <option value="family">Family</option>
          </select>
          <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Password" className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" required minLength={4} />
          <input type="number" value={newUser.salary} onChange={(e) => setNewUser({ ...newUser, salary: e.target.value })} placeholder="Salary (optional)" className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" />
          <input value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="WhatsApp (+852...)" className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" />
        </div>
        <button type="submit" className="px-5 py-2 bg-gradient-to-r from-[#5c6b3c] to-[#4a5630] text-white rounded-xl text-sm font-semibold shadow-md active:scale-[0.98]">
          Add User
        </button>
      </form>

      <div className="glass rounded-2xl shadow-sm overflow-hidden divide-y divide-[#d4c9b8]/20">
        {users.map((u) => (
          <div key={u.id} className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${u.active ? "bg-[#5c6b3c]" : "bg-[#d4c9b8]"}`}>
                {u.name[0].toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-[#2c2418]">{u.name}</div>
                <div className="text-xs text-[#8b7355]">
                  {u.role} {u.salary ? `· ${fmt(u.salary)}/month` : ""} {!u.active ? "· Inactive" : ""}
                </div>
              </div>
            </div>
            <button
              onClick={() => toggleActive(u.id, u.active)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${u.active ? "text-red-500 hover:bg-red-50" : "text-[#5c6b3c] hover:bg-[#5c6b3c]/10"}`}
            >
              {u.active ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CurrencyTab({ headers }: { headers: Record<string, string> }) {
  const [symbol, setSymbol] = useState("");
  const [code, setCode] = useState("");
  const [household, setHousehold] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      setSymbol(d.settings.currency_symbol || "HK$");
      setCode(d.settings.currency_code || "HKD");
      setHousehold(d.settings.household_name || "My Household");
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/settings", {
      method: "PUT", headers,
      body: JSON.stringify({ currency_symbol: symbol, currency_code: code, household_name: household }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={save} className="glass rounded-2xl p-5 shadow-sm space-y-4 max-w-md">
      <h3 className="font-bold text-[#2c2418] text-sm">App Settings</h3>
      <div>
        <label className="block text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Household Name</label>
        <input value={household} onChange={(e) => setHousehold(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Currency Symbol</label>
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="HK$" className="w-full px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1">Currency Code</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="HKD" className="w-full px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" />
        </div>
      </div>
      <button type="submit" className="px-5 py-2 bg-gradient-to-r from-[#5c6b3c] to-[#4a5630] text-white rounded-xl text-sm font-semibold shadow-md active:scale-[0.98]">
        {saved ? "Saved!" : "Save Settings"}
      </button>
    </form>
  );
}

function CategoriesTab({ headers }: { headers: Record<string, string> }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6B7280");

  function load() { fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories)); }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/categories", { method: "POST", headers, body: JSON.stringify({ name: newName, color: newColor }) });
    setNewName(""); load();
  }

  async function remove(id: number) {
    if (!confirm("Delete?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE", headers });
    load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="glass rounded-2xl p-5 shadow-sm flex gap-3 items-end">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Category name" className="flex-1 px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" required />
        <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-10 h-10 rounded-xl border border-[#d4c9b8] cursor-pointer" />
        <button type="submit" className="px-4 py-2 bg-[#5c6b3c] text-white rounded-xl text-sm font-semibold">Add</button>
      </form>
      <div className="glass rounded-2xl shadow-sm divide-y divide-[#d4c9b8]/20">
        {categories.map((c) => (
          <div key={c.id} className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: c.color }} />
              <span className="text-sm font-medium text-[#2c2418]">{c.name}</span>
            </div>
            <button onClick={() => remove(c.id)} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelsTab({ headers }: { headers: Record<string, string> }) {
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [newCh, setNewCh] = useState({ name: "", type: "wallet", icon: "💳", monthly_limit: "" });

  function load() { fetch("/api/channels").then((r) => r.json()).then((d) => setChannels(d.channels)); }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/channels", {
      method: "POST", headers,
      body: JSON.stringify({ ...newCh, monthly_limit: newCh.monthly_limit ? parseFloat(newCh.monthly_limit) : null }),
    });
    setNewCh({ name: "", type: "wallet", icon: "💳", monthly_limit: "" }); load();
  }

  async function remove(id: number) {
    if (!confirm("Delete?")) return;
    await fetch(`/api/channels/${id}`, { method: "DELETE", headers });
    load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="glass rounded-2xl p-5 shadow-sm space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input value={newCh.name} onChange={(e) => setNewCh({ ...newCh, name: e.target.value })} placeholder="Name" className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" required />
          <select value={newCh.type} onChange={(e) => setNewCh({ ...newCh, type: e.target.value })} className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm">
            <option value="cash">Cash</option>
            <option value="wallet">Wallet</option>
            <option value="card">Card</option>
          </select>
          <input value={newCh.icon} onChange={(e) => setNewCh({ ...newCh, icon: e.target.value })} placeholder="Icon" className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" />
          <input type="number" value={newCh.monthly_limit} onChange={(e) => setNewCh({ ...newCh, monthly_limit: e.target.value })} placeholder="Monthly limit" className="px-3 py-2 bg-white border border-[#d4c9b8] rounded-xl text-sm" />
        </div>
        <button type="submit" className="px-4 py-2 bg-[#5c6b3c] text-white rounded-xl text-sm font-semibold">Add Channel</button>
      </form>
      <div className="glass rounded-2xl shadow-sm divide-y divide-[#d4c9b8]/20">
        {channels.map((ch) => (
          <div key={ch.id} className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">{ch.icon}</span>
              <div>
                <span className="text-sm font-medium text-[#2c2418]">{ch.name}</span>
                <span className="text-xs text-[#8b7355] ml-2">{ch.type}{ch.monthly_limit ? ` · Limit: ${fmt(ch.monthly_limit)}` : ""}</span>
              </div>
            </div>
            <button onClick={() => remove(ch.id)} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
