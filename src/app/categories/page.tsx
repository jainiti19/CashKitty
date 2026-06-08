"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6B7280");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ name: string; color: string }>({ name: "", color: "" });

  function loadCategories() {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories));
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    if (res.ok) {
      setNewName("");
      setNewColor("#6B7280");
      loadCategories();
    } else {
      const err = await res.json();
      alert(err.error);
    }
  }

  async function saveEdit(id: number) {
    await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    setEditingId(null);
    loadCategories();
  }

  async function deleteCategory(id: number) {
    if (!confirm("Delete this category? Existing transactions will become uncategorized.")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    loadCategories();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Categories</h2>

      <form onSubmit={addCategory} className="glass rounded-2xl p-5 shadow-sm flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Color</label>
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-11 h-11 rounded-xl border border-gray-200 cursor-pointer shadow-sm"
          />
        </div>
        <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all">
          Add
        </button>
      </form>

      <div className="glass rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100/50">
        {categories.map((c, i) => (
          <div key={c.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-white/50 transition-colors animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
            {editingId === c.id ? (
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="color"
                  value={editData.color}
                  onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                  className="w-9 h-9 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <button onClick={() => saveEdit(c.id)} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold">Save</button>
                <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold">Cancel</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-lg shadow-sm" style={{ backgroundColor: c.color }} />
                  <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditingId(c.id); setEditData({ name: c.name, color: c.color }); }}
                    className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button onClick={() => deleteCategory(c.id)} className="px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors">
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
