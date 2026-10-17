"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Layers, Edit3, Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Vertical {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  solutions?: { id: string; name: string }[];
  _count?: { solutions: number };
}

export default function VerticalsPage() {
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vertical | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Vertical[]>("/api/verticals").then(setVerticals).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "" }); setShowModal(true); };
  const openEdit = (v: Vertical) => { setEditing(v); setForm({ name: v.name, description: v.description || "" }); setShowModal(true); };

  const save = async () => {
    setError("");
    try {
      const url = editing ? `/api/verticals/${editing.id}` : "/api/verticals";
      const method = editing ? "PUT" : "POST";
      const data = await apiFetch<Vertical>(url, { method, body: JSON.stringify(form) });
      if (editing) setVerticals(verticals.map((v) => (v.id === editing.id ? { ...data, _count: v._count } : v)));
      else setVerticals([{ ...data, _count: { solutions: 0 } }, ...verticals]);
      setShowModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vertical?")) return;
    try {
      await apiFetch(`/api/verticals/${id}`, { method: "DELETE" });
      setVerticals(verticals.filter((v) => v.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const filtered = verticals.filter((v) => v.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8 animate-fadeIn">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Verticals</h1>
          <p className="text-gray-500 mt-1.5">Manage business verticals and divisions</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md shadow-indigo-200/50 btn-lift">
          <Plus className="w-5 h-5" /> Add Vertical
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
          <div className="flex items-center justify-center w-10 flex-shrink-0">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input type="text" placeholder="Search verticals..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2.5 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 text-lg font-medium">No verticals found</p>
          <p className="text-gray-400 text-sm mt-1">Add your first business vertical to get started</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
        {filtered.map((v) => (
          <div key={v.id} className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6 text-violet-500" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(v)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(v.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{v.name}</h3>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2 min-h-[40px]">{v.description || "No description"}</p>
            {v.solutions && v.solutions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {v.solutions.map((s) => (
                  <span key={s.id} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                    {s.name}
                  </span>
                ))}
              </div>
            )}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">{v.solutions?.length ?? v._count?.solutions ?? 0} solutions</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${v.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                {v.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slideIn">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? "Edit Vertical" : "Add Vertical"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</div>}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" placeholder="Vertical name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none transition-all" placeholder="Description" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium text-sm btn-lift transition-all">Cancel</button>
              <button onClick={save} className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium text-sm shadow-md shadow-indigo-200/50 btn-lift transition-all">{editing ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
