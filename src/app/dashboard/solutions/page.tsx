"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Building2, Edit3, Trash2, X, Package, ChevronLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

interface Vertical { id: string; name: string; }
interface Solution {
  id: string;
  name: string;
  description?: string;
  vertical: Vertical;
  packages?: { id: string }[];
  _count?: { packages: number };
}
interface Product {
  id: string;
  name: string;
  rate: number;
  unit: string;
  brand?: string;
  modelNumber?: string;
}
interface KitItem {
  productId: string;
  quantity: number;
  rate: number;
  discount: number;
}
interface Kit {
  id?: string;
  name: string;
  description: string;
  basePrice: number;
  solutionId: string;
  items: KitItem[];
}

const emptyItem = (productId = ""): KitItem => ({ productId, quantity: 1, rate: 0, discount: 0 });

export default function SolutionsPage() {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Solution | null>(null);
  const [form, setForm] = useState({ name: "", description: "", verticalId: "" });
  const [error, setError] = useState("");

  // Kit management
  const [kitSolution, setKitSolution] = useState<Solution | null>(null);
  const [kits, setKits] = useState<Kit[]>([]);
  const [editingKit, setEditingKit] = useState<Kit | null>(null);
  const [kitError, setKitError] = useState("");
  const [kitSaving, setKitSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Solution[]>("/api/solutions").then(setSolutions),
      apiFetch<Vertical[]>("/api/verticals").then(setVerticals),
      apiFetch<Product[]>("/api/products").then(setProducts),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "", verticalId: "" }); setError(""); setShowModal(true); };
  const openEdit = (s: Solution) => { setEditing(s); setForm({ name: s.name, description: s.description || "", verticalId: s.vertical?.id || "" }); setError(""); setShowModal(true); };

  const save = async () => {
    setError("");
    try {
      const url = editing ? `/api/solutions/${editing.id}` : "/api/solutions";
      const method = editing ? "PUT" : "POST";
      await apiFetch(url, { method, body: JSON.stringify(form) });
      const list = await apiFetch<Solution[]>("/api/solutions");
      setSolutions(list);
      setShowModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this solution?")) return;
    try {
      await apiFetch(`/api/solutions/${id}`, { method: "DELETE" });
      setSolutions(solutions.filter((s) => s.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const openKits = async (s: Solution) => {
    setKitSolution(s);
    setEditingKit(null);
    setKitError("");
    try {
      const list = await apiFetch<(Omit<Kit, "description" | "basePrice"> & { description?: string; basePrice?: number })[]>(
        `/api/packages?solutionId=${s.id}`
      );
      setKits(list.map((k) => ({ ...k, description: k.description || "", basePrice: k.basePrice || 0 })));
    } catch {
      setKits([]);
    }
  };

  const closeKits = async () => {
    setKitSolution(null);
    setEditingKit(null);
    const list = await apiFetch<Solution[]>("/api/solutions").catch(() => null);
    if (list) setSolutions(list);
  };

  const newKit = () => {
    if (!kitSolution) return;
    setKitError("");
    setEditingKit({ name: "", description: "", basePrice: 0, solutionId: kitSolution.id, items: [emptyItem()] });
  };

  const editKit = (k: Kit) => {
    setKitError("");
    setEditingKit({ ...k, items: k.items.length ? k.items : [emptyItem()] });
  };

  const updateKitItem = (idx: number, patch: Partial<KitItem>) => {
    if (!editingKit) return;
    const items = editingKit.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    setEditingKit({ ...editingKit, items });
  };

  const saveKit = async () => {
    if (!editingKit) return;
    setKitError("");
    if (!editingKit.name.trim()) { setKitError("Kit name is required"); return; }
    const items = editingKit.items.filter((it) => it.productId);
    setKitSaving(true);
    try {
      const payload = { ...editingKit, items };
      if (editingKit.id) {
        await apiFetch(`/api/packages/${editingKit.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/api/packages", { method: "POST", body: JSON.stringify(payload) });
      }
      const list = await apiFetch<{ description?: string; basePrice?: number }[]>(
        `/api/packages?solutionId=${kitSolution!.id}`
      );
      setKits(list as Kit[]);
      setEditingKit(null);
    } catch (e) {
      setKitError(e instanceof Error ? e.message : "Failed to save kit");
    } finally {
      setKitSaving(false);
    }
  };

  const deleteKit = async (id: string) => {
    if (!confirm("Delete this kit?")) return;
    try {
      await apiFetch(`/api/packages/${id}`, { method: "DELETE" });
      setKits(kits.filter((k) => k.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete kit");
    }
  };

  const filtered = solutions.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8 animate-fadeIn">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Solutions</h1>
          <p className="text-gray-500 mt-1.5">Manage solutions, kits & combo packages</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md shadow-indigo-200/50 btn-lift">
          <Plus className="w-5 h-5" /> Add Solution
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
          <div className="flex items-center justify-center w-10 flex-shrink-0">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input type="text" placeholder="Search solutions..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2.5 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 text-lg font-medium">No solutions found</p>
          <p className="text-gray-400 text-sm mt-1">Add your first solution to get started</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
        {filtered.map((s) => (
          <div key={s.id} className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(s)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{s.name}</h3>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2 min-h-[40px]">{s.description || "No description"}</p>
            <button
              onClick={() => openKits(s)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all text-sm font-medium btn-lift"
            >
              <Package className="w-4 h-4" />
              Manage Kits{(s.packages?.length ?? s._count?.packages) ? ` (${s.packages?.length ?? s._count?.packages})` : ""}
            </button>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs bg-violet-50 text-violet-600 px-2.5 py-0.5 rounded-full font-medium border border-violet-200">{s.vertical.name}</span>
              <span className="text-sm text-gray-500">{s.packages?.length ?? s._count?.packages ?? 0} kits</span>
            </div>
          </div>
        ))}
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slideIn">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? "Edit Solution" : "Add Solution"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</div>}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" placeholder="Solution name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none transition-all" placeholder="Description" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Vertical *</label>
                <select value={form.verticalId} onChange={(e) => setForm({ ...form, verticalId: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all">
                  <option value="">Select Vertical</option>
                  {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium text-sm btn-lift transition-all">Cancel</button>
              <button onClick={save} className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium text-sm shadow-md shadow-indigo-200/50 btn-lift transition-all">{editing ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Kit manager modal */}
      {kitSolution && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-slideIn">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                {editingKit && (
                  <button onClick={() => setEditingKit(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingKit ? (editingKit.id ? "Edit Kit" : "New Kit") : `Kits — ${kitSolution.name}`}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {editingKit ? "Add products that get inserted into quotations in one click" : "Combo packages insertable into quotations via Insert Kit"}
                  </p>
                </div>
              </div>
              <button onClick={closeKits} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {kitError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">{kitError}</div>}

              {!editingKit ? (
                <div className="space-y-3">
                  {kits.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No kits yet. Create one to bundle products into a combo solution.</p>
                    </div>
                  )}
                  {kits.map((k) => {
                    const total = k.items.reduce((sum, it) => sum + it.quantity * it.rate * (1 - it.discount / 100), 0);
                    return (
                      <div key={k.id} className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{k.name}</p>
                          <p className="text-sm text-gray-500 truncate">
                            {k.items.length} product{k.items.length === 1 ? "" : "s"} · {formatCurrency(total)}
                            {k.description ? ` · ${k.description}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => editKit(k)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => k.id && deleteKit(k.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={newKit} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 border-2 border-dashed border-indigo-300 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all text-sm font-medium btn-lift">
                    <Plus className="w-4 h-4" /> New Kit
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Kit Name *</label>
                      <input type="text" value={editingKit.name} onChange={(e) => setEditingKit({ ...editingKit, name: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" placeholder="e.g. 4-Camera CCTV Kit" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Base Price (₹)</label>
                      <input type="number" value={editingKit.basePrice} onChange={(e) => setEditingKit({ ...editingKit, basePrice: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <input type="text" value={editingKit.description} onChange={(e) => setEditingKit({ ...editingKit, description: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" placeholder="e.g. 4 dome cameras + 16ch NVR" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Products in this kit</label>
                    <div className="space-y-2">
                      {editingKit.items.map((it, idx) => {
                        const product = products.find((p) => p.id === it.productId);
                        return (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-gray-50 border border-gray-200 rounded-xl p-3">
                            <div className="col-span-5">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Product</label>
                              <select
                                value={it.productId}
                                onChange={(e) => {
                                  const p = products.find((x) => x.id === e.target.value);
                                  updateKitItem(idx, { productId: e.target.value, rate: p ? p.rate : it.rate });
                                }}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                              >
                                <option value="">— Select product —</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}{p.brand ? ` (${p.brand})` : ""}</option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                              <input type="number" min="0.01" step="any" value={it.quantity} onChange={(e) => updateKitItem(idx, { quantity: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none" />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Rate (₹)</label>
                              <input type="number" min="0" step="any" value={it.rate} onChange={(e) => updateKitItem(idx, { rate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none" />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Disc %</label>
                              <input type="number" min="0" max="100" step="any" value={it.discount} onChange={(e) => updateKitItem(idx, { discount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none" />
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <button
                                onClick={() => setEditingKit({ ...editingKit, items: editingKit.items.filter((_, i) => i !== idx) })}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            {product && (
                              <p className="col-span-12 text-xs text-gray-400 -mt-1">
                                {formatCurrency(it.quantity * it.rate * (1 - it.discount / 100))}
                                {product.modelNumber ? ` · ${product.modelNumber}` : ""}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setEditingKit({ ...editingKit, items: [...editingKit.items, emptyItem()] })}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 border-2 border-dashed border-indigo-300 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all text-sm font-medium btn-lift"
                    >
                      <Plus className="w-4 h-4" /> Add Product
                    </button>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setEditingKit(null)} className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium text-sm btn-lift transition-all">Cancel</button>
                    <button onClick={saveKit} disabled={kitSaving} className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium text-sm shadow-md shadow-indigo-200/50 btn-lift transition-all disabled:opacity-50">
                      {kitSaving ? "Saving…" : editingKit.id ? "Update Kit" : "Create Kit"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
