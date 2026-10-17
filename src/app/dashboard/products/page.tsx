"use client";

import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Search,
  Package,
  Edit3,
  Trash2,
  X,
  Upload,
  Download,
  Filter,
  ImageIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiFetch, getStoredUser, uploadFile } from "@/lib/api";
import { generateProductsExcel, buildProductImportRows } from "@/lib/excel";

interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  brand?: string;
  modelNumber?: string;
  specifications?: string;
  unit: string;
  rate: number;
  gstRate: number;
  hsnCode?: string;
  isActive: boolean;
  image?: string | null;
  category?: { id: string; name: string };
  categoryId?: string;
}

interface Category {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    sku: "",
    brand: "",
    modelNumber: "",
    specifications: "",
    unit: "nos",
    rate: 0,
    gstRate: 18,
    hsnCode: "",
    categoryId: "",
    image: "",
  });
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const importInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const isAdmin = getStoredUser()?.role === "admin";

  useEffect(() => {
    Promise.all([
      apiFetch<Product[]>("/api/products").then(setProducts),
      apiFetch<Category[]>("/api/categories").then(setCategories),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", sku: "", brand: "", modelNumber: "", specifications: "", unit: "nos", rate: 0, gstRate: 18, hsnCode: "", categoryId: "", image: "" });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || "",
      sku: p.sku || "",
      brand: p.brand || "",
      modelNumber: p.modelNumber || "",
      specifications: p.specifications || "",
      unit: p.unit,
      rate: p.rate,
      gstRate: p.gstRate,
      hsnCode: p.hsnCode || "",
      categoryId: p.categoryId || "",
      image: p.image || "",
    });
    setShowModal(true);
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    setError("");
    try {
      const res = await uploadFile<{ path: string }>(file, "product");
      setForm((f) => ({ ...f, image: res.path }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const save = async () => {
    setError("");
    try {
      const url = editing ? `/api/products/${editing.id}` : "/api/products";
      const method = editing ? "PUT" : "POST";
      const data = await apiFetch<Product>(url, { method, body: JSON.stringify(form) });
      if (editing) {
        setProducts(products.map((p) => (p.id === editing.id ? { ...data, category: p.category } : p)));
      } else {
        const list = await apiFetch<Product[]>("/api/products");
        setProducts(list);
      }
      setShowModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await apiFetch(`/api/products/${id}`, { method: "DELETE" });
      setProducts(products.filter((p) => p.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const exportProducts = async () => {
    setExporting(true);
    try {
      const list = await apiFetch<Parameters<typeof generateProductsExcel>[0]>(
        "/api/products"
      );
      await generateProductsExcel(list);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const num = (v: unknown): number => {
    if (typeof v === "number") return v;
    const n = parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
    return isNaN(n) ? 0 : n;
  };
  const optNum = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
    return isNaN(n) ? null : n;
  };
  const str = (v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s || null;
  };

  const importProducts = async (file: File) => {
    setImporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const rows = buildProductImportRows(wb);

      const normalized = rows
        .map((r) => {
          const rate = optNum(r["selling rate"] ?? r.rate);
          const name = str(r.name);
          if (!name || rate === null) return null;
          const categoryName = str(r.category);
          const cat = categoryName
            ? categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase())
            : undefined;
          const active = str(r.active);
          return {
            name,
            description: str(r.description),
            sku: str(r.sku),
            brand: str(r.brand),
            modelNumber: str(r.model),
            specifications: str(r.specifications),
            subCategory: str(r["sub category"]),
            costPrice: optNum(r["cost price"]),
            unit: str(r.unit) || "nos",
            rate,
            gstRate: num(r["gst %"] ?? r.gst) || 18,
            hsnCode: str(r.hsn),
            isActive: active ? !/^(no|false|0)$/i.test(active) : true,
            categoryId: cat?.id || null,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (normalized.length === 0) {
        alert(
          "No valid rows found. The file needs at least 'name' and 'selling rate' columns (use Export to get the template)."
        );
        return;
      }

      const result = await apiFetch<{ created: number; updated: number }>(
        "/api/products/import",
        { method: "POST", body: JSON.stringify({ products: normalized }) }
      );
      const list = await apiFetch<Product[]>("/api/products");
      setProducts(list);
      alert(
        `Import complete: ${result.created} created, ${result.updated} updated` +
          (rows.length > normalized.length
            ? ` (${rows.length - normalized.length} rows skipped)`
            : "")
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || p.categoryId === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8 animate-fadeIn">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Products</h1>
          <p className="text-gray-500 mt-1.5">Manage your product catalog</p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <>
              <button
                onClick={() => importInput.current?.click()}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium btn-lift disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {importing ? "Importing…" : "Import"}
              </button>
              <input
                ref={importInput}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importProducts(f);
                  e.target.value = "";
                }}
              />
              <button
                onClick={exportProducts}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium btn-lift disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {exporting ? "Exporting…" : "Export"}
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md shadow-indigo-200/50 btn-lift"
              >
                <Plus className="w-5 h-5" />
                Add Product
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all flex-1">
          <div className="flex items-center justify-center w-10 flex-shrink-0">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 mb-6 text-sm">
        <span className="text-gray-500">{filtered.length} products</span>
        <div className="flex gap-2">
          {categories.slice(0, 4).map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(categoryFilter === c.id ? "all" : c.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                categoryFilter === c.id
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
        {filtered.map((product) => (
          <div
            key={product.id}
            className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
          >
            {/* Top gradient accent */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
              product.category?.name === "Furniture" ? "from-amber-400 to-orange-500" :
              product.category?.name === "Electronics" ? "from-blue-400 to-indigo-500" :
              product.category?.name === "IT Equipment" ? "from-cyan-400 to-blue-500" :
              product.category?.name === "Stationery" ? "from-yellow-400 to-amber-500" :
              product.category?.name === "Networking" ? "from-emerald-400 to-green-500" :
              "from-indigo-400 to-purple-500"
            }`} />

            <div className="flex items-start justify-between mb-4 mt-1">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-5 h-5 text-indigo-500" />
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => openEdit(product)}
                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2 min-h-[40px]">{product.description || "No description"}</p>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                {product.sku && (
                  <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-mono">
                    {product.sku}
                  </span>
                )}
              </div>
              <div className="text-lg font-bold gradient-text">{formatCurrency(product.rate)}</div>
            </div>

            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="text-[11px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md">{product.unit}</span>
              <span className="text-[11px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md">GST {product.gstRate}%</span>
              {product.category && (
                <span className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-medium">
                  {product.category.name}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 text-lg font-medium">No products found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slideIn">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</div>}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                  placeholder="Product name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none transition-all"
                  placeholder="Product description"
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Product Photo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                      {form.image ? (
                        <img src={form.image} alt="Product" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => photoInput.current?.click()}
                        disabled={uploadingPhoto}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingPhoto ? "Uploading…" : form.image ? "Replace" : "Upload"}
                      </button>
                      {form.image && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, image: "" })}
                          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-red-600 rounded-xl hover:bg-red-50 transition-all text-sm font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      )}
                      <p className="text-[11px] text-gray-400">Shown in BOQ when photos are on</p>
                    </div>
                  </div>
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePhotoUpload(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Make / Brand</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                    placeholder="e.g. Hikvision"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Model Number</label>
                  <input
                    type="text"
                    value={form.modelNumber}
                    onChange={(e) => setForm({ ...form, modelNumber: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                    placeholder="e.g. DS-2CD2143G2-I"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Specifications</label>
                <textarea
                  value={form.specifications}
                  onChange={(e) => setForm({ ...form, specifications: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none transition-all"
                  placeholder="e.g. 4MP, IP67, 30m IR range"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                    placeholder="e.g. CAM-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">HSN Code</label>
                  <input
                    type="text"
                    value={form.hsnCode}
                    onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                    placeholder="e.g. 9401"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                  >
                    <option value="nos">Nos</option>
                    <option value="pcs">Pcs</option>
                    <option value="kg">Kg</option>
                    <option value="m">M</option>
                    <option value="sqft">Sqft</option>
                    <option value="set">Set</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Rate</label>
                  <input
                    type="number"
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">GST %</label>
                  <select
                    value={form.gstRate}
                    onChange={(e) => setForm({ ...form, gstRate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                >
                  <option value="">No Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium text-sm btn-lift"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all font-medium text-sm shadow-md shadow-indigo-200/50 btn-lift"
              >
                {editing ? "Update" : "Create"} Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
