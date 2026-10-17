"use client";

import { useEffect, useState } from "react";
import { Plus, Search, FolderTree, Edit3, Trash2, X, Package } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  color?: string;
  _count?: { products: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", color: "#6366f1" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Category[]>("/api/categories").then(setCategories).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditing(null); setForm({ name: "", color: "#6366f1" }); setShowModal(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, color: c.color || "#6366f1" }); setShowModal(true); };

  const save = async () => {
    setError("");
    try {
      const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
      const method = editing ? "PUT" : "POST";
      const data = await apiFetch<Category>(url, { method, body: JSON.stringify(form) });
      if (editing) setCategories(categories.map((c) => (c.id === editing.id ? { ...data, _count: c._count } : c)));
      else setCategories([{ ...data, _count: { products: 0 } }, ...categories]);
      setShowModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
      setCategories(categories.filter((c) => c.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8 animate-fadeIn">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Categories</h1>
          <p className="text-gray-500 mt-1.5">Organize your products into categories</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md shadow-indigo-200/50 btn-lift">
          <Plus className="w-5 h-5" /> Add Category
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
          <div className="flex items-center justify-center w-10 flex-shrink-0">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input type="text" placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2.5 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderTree className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 text-lg font-medium">No categories found</p>
          <p className="text-gray-400 text-sm mt-1">Add categories to organize your products</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
        {filtered.map((category) => (
          <div key={category.id} className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-lg transition-all duration-300 relative overflow-hidden min-h-[160px] flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(to right, ${category.color}, ${category.color}88)` }} />
            <div className="flex items-start justify-between mb-4 mt-1">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform" style={{ backgroundColor: category.color + "15" }}>
                <FolderTree className="w-6 h-6" style={{ color: category.color }} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(category)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(category.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Package className="w-3.5 h-3.5" />
              {(category._count?.products || 0) === 1 ? "1 product" : `${category._count?.products || 0} products`}
            </div>
          </div>
        ))}
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slideIn">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? "Edit Category" : "Add Category"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</div>}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" placeholder="Category name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-12 h-10 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer" />
                  <input type="text" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="flex-1 px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none font-mono transition-all" />
                </div>
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
