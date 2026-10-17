"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Send, Package, FileText, CalendarClock, UserRound, UserPlus } from "lucide-react";
import Link from "next/link";
import { apiFetch, getStoredUser } from "@/lib/api";
import { calcQuotationTotals } from "@/lib/calc";
import {
  LineItemCard,
  SectionRow,
  type QuoteItem,
  type ProductOption,
} from "@/components/quotation/LineItemCard";
import { SummaryPanel, type SummaryValues } from "@/components/quotation/SummaryPanel";
import { QuickCustomerForm, type CustomerOption } from "@/components/quotation/QuickCustomerForm";

interface Product extends ProductOption {
  sku?: string;
  description?: string | null;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SolutionPackageItem {
  productId: string;
  quantity: number;
  rate: number;
  discount: number;
}

interface SolutionPackage {
  id: string;
  name: string;
  items: SolutionPackageItem[];
}

interface Solution {
  id: string;
  name: string;
  packages: SolutionPackage[];
}

export default function NewQuotationPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const canAssign = getStoredUser()?.role === "admin";
  const [saving, setSaving] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  const loadDefaults = () => {
    try {
      const stored = localStorage.getItem("ddcpl_settings");
      if (stored) {
        const data = JSON.parse(stored);
        return {
          terms: data.defaults?.defaultTerms || "1. This quotation is valid for 30 days from the date of issue.\n2. Payment terms: 50% advance, 50% on delivery.\n3. Prices are inclusive of GST unless otherwise stated.\n4. Delivery within 2-3 weeks from the date of order confirmation.",
          notes: data.defaults?.defaultNotes || "",
          validityDays: data.defaults?.validityDays || 30,
        };
      }
    } catch {}
    return {
      terms: "1. This quotation is valid for 30 days from the date of issue.\n2. Payment terms: 50% advance, 50% on delivery.\n3. Prices are inclusive of GST unless otherwise stated.\n4. Delivery within 2-3 weeks from the date of order confirmation.",
      notes: "",
      validityDays: 30,
    };
  };

  const defaults = loadDefaults();
  const validDate = new Date();
  validDate.setDate(validDate.getDate() + defaults.validityDays);

  const [form, setForm] = useState({
    title: "",
    description: "",
    customerId: "",
    validTill: validDate.toISOString().split("T")[0],
    discountType: "percentage",
    discountValue: 0,
    additionalCharges: 0,
    shippingCharges: 0,
    installationCharge: 0,
    taxExcluded: false,
    notes: defaults.notes,
    terms: defaults.terms,
    projectName: "",
    projectRef: "",
    siteAddress: "",
    followUpDate: "",
    responseDeadline: "",
    userId: "",
  });

  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: crypto.randomUUID(),
      itemType: "ITEM",
      description: "",
      hsnCode: "",
      unit: "nos",
      quantity: 1,
      rate: 0,
      discount: 0,
      gstRate: 18,
      installationRate: 0,
      isOptional: false,
    },
  ]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [kitId, setKitId] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch<Product[]>("/api/products"),
      apiFetch<Customer[]>("/api/customers"),
      apiFetch<Solution[]>("/api/solutions"),
    ]).then(([p, c, s]) => { setProducts(p); setCustomers(c); setSolutions(s); }).catch(() => {});
    const me = getStoredUser();
    if (me?.role === "admin") {
      apiFetch<UserOption[]>("/api/users")
        .then((u) => {
          setUsers(u);
          setForm((f) => ({ ...f, userId: f.userId || me.id }));
        })
        .catch(() => {});
    }
  }, []);

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), itemType: "ITEM", description: "", hsnCode: "", unit: "nos", quantity: 1, rate: 0, discount: 0, gstRate: 18, installationRate: 0, isOptional: false }]);
  };

  const addSection = () => {
    setItems([...items, { id: crypto.randomUUID(), itemType: "SECTION", description: "", hsnCode: "", unit: "nos", quantity: 1, rate: 0, discount: 0, gstRate: 0, isOptional: false }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setItems(next);
  };

  const updateItem = (id: string, field: string, value: string | number | boolean) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const selectProduct = (id: string, itemId: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setItems(items.map((i) => (i.id === itemId ? { ...i, productId: product.id, description: product.name, brand: product.brand || "", modelNumber: product.modelNumber || "", specifications: product.description || product.specifications || "", hsnCode: product.hsnCode || "", unit: product.unit, rate: product.rate, gstRate: product.gstRate } : i)));
  };

  const insertKit = (value: string) => {
    setKitId("");
    if (!value) return;
    const [solutionId, packageId] = value.split("::");
    const solution = solutions.find((s) => s.id === solutionId);
    const pkg = solution?.packages.find((p) => p.id === packageId);
    if (!solution || !pkg) return;
    const rows: QuoteItem[] = [
      { id: crypto.randomUUID(), itemType: "SECTION", description: pkg.name, hsnCode: "", unit: "nos", quantity: 1, rate: 0, discount: 0, gstRate: 0, isOptional: false },
    ];
    pkg.items.forEach((pi) => {
      const product = products.find((p) => p.id === pi.productId);
      rows.push({
        id: crypto.randomUUID(),
        itemType: "ITEM",
        productId: pi.productId,
        description: product?.name || "",
        brand: product?.brand || "",
        modelNumber: product?.modelNumber || "",
        specifications: product?.description || product?.specifications || "",
        hsnCode: product?.hsnCode || "",
        unit: product?.unit || "nos",
        quantity: pi.quantity,
        rate: pi.rate,
        discount: pi.discount,
        gstRate: product?.gstRate ?? 18,
        installationRate: 0,
        isOptional: false,
      });
    });
    setItems([...items, ...rows]);
  };

  const totals = calcQuotationTotals({
    items,
    discountType: form.discountType,
    discountValue: form.discountValue,
    additionalCharges: form.additionalCharges,
    shippingCharges: form.shippingCharges,
    installationCharge: form.installationCharge,
  });

  const billableItems = items.filter((i) => i.itemType !== "SECTION" && !i.isOptional && i.description.trim());
  const optionalCount = items.filter((i) => i.itemType !== "SECTION" && i.isOptional && i.description.trim()).length;

  const summaryValues: SummaryValues = {
    discountType: form.discountType,
    discountValue: form.discountValue,
    additionalCharges: form.additionalCharges,
    shippingCharges: form.shippingCharges,
    installationCharge: form.installationCharge,
  };

  const saveQuotation = async (status: string) => {
    if (!form.title || !form.customerId) { alert("Please fill in the title and customer"); return; }
    const filledItems = items.filter((i) => i.itemType === "SECTION" || i.description.trim());
    if (filledItems.length === 0) { alert("Please add at least one line item"); return; }
    setSaving(true);
    try {
      await apiFetch("/api/quotations", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          followUpDate: form.followUpDate || null,
          responseDeadline: form.responseDeadline || null,
          status,
          items: filledItems.map(({ id: _id, ...rest }) => rest),
        }),
      });
      router.push("/dashboard/quotations");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save quotation");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8 animate-fadeIn">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/quotations" className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New Quotation</h1>
            <p className="text-gray-500 mt-1.5 text-sm">Create a professional quotation</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => saveQuotation("draft")}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all btn-lift"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            onClick={() => saveQuotation("sent")}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md shadow-indigo-200/50 btn-lift"
          >
            <Send className="w-4 h-4" />
            Save & Send
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="xl:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-indigo-500" />
              </div>
              Quotation Details
            </h2>
            <p className="text-xs text-gray-400 mb-5">Basic information shown at the top of the quotation</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., CCTV Surveillance System Supply & Installation"
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the quotation..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm resize-none transition-all"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Customer *</label>
                  <button
                    type="button"
                    onClick={() => setShowCustomerForm((v) => !v)}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> New Customer
                  </button>
                </div>
                <select
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm transition-all"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>
                  ))}
                </select>
                {showCustomerForm && (
                  <QuickCustomerForm
                    onCreated={(c) => {
                      setCustomers((prev) => [c, ...prev]);
                      setForm((f) => ({ ...f, customerId: c.id }));
                      setShowCustomerForm(false);
                    }}
                    onCancel={() => setShowCustomerForm(false)}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Valid Till</label>
                <input
                  type="date"
                  value={form.validTill}
                  onChange={(e) => setForm({ ...form, validTill: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm transition-all"
                />
              </div>
              {canAssign && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sales Person</label>
                  <select
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm transition-all"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                        {u.name ? ` · ${u.email}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-gray-400">
                    <UserRound className="w-3 h-3 inline-block -mt-0.5 mr-1" />
                    Owns the quotation — receives follow-up reminders and appears as Sales Person on the PDF.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Project & Follow-up */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                <CalendarClock className="w-4 h-4 text-indigo-500" />
              </div>
              Project &amp; Follow-up
            </h2>
            <p className="text-xs text-gray-400 mb-5">Optional — project context and reminder dates</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Project Name</label>
                <input
                  type="text"
                  value={form.projectName}
                  onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                  placeholder="e.g., Corporate Office Fit-out"
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Enquiry Ref</label>
                <input
                  type="text"
                  value={form.projectRef}
                  onChange={(e) => setForm({ ...form, projectRef: e.target.value })}
                  placeholder="e.g., ENQ-2026-045"
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm transition-all"
                />
                <p className="mt-1.5 text-xs text-gray-400">Customer&apos;s enquiry / RFQ reference — printed as “Enquiry Ref” on the PDF.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Follow-up Date</label>
                <input
                  type="date"
                  value={form.followUpDate}
                  onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm transition-all"
                />
                <p className="mt-1.5 text-xs text-gray-400">We&apos;ll remind the sales person 7 / 3 / 1 days before this date to chase the customer.</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Site Address</label>
                <textarea
                  value={form.siteAddress}
                  onChange={(e) => setForm({ ...form, siteAddress: e.target.value })}
                  placeholder="Project site address..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm resize-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Response Deadline</label>
                <input
                  type="date"
                  value={form.responseDeadline}
                  onChange={(e) => setForm({ ...form, responseDeadline: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm transition-all"
                />
                <p className="mt-1.5 text-xs text-gray-400">Date you expect the customer&apos;s reply — shown as “Response By” on the quotation detail.</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-purple-500" />
                </div>
                Line Items
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={kitId}
                  onChange={(e) => insertKit(e.target.value)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <option value="">Insert Kit</option>
                  {solutions.flatMap((s) =>
                    s.packages.map((p) => (
                      <option key={p.id} value={`${s.id}::${p.id}`}>
                        {s.packages.length > 1 ? `${s.name} — ${p.name}` : p.name}
                      </option>
                    ))
                  )}
                </select>
                <button
                  onClick={addSection}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors btn-lift"
                >
                  <Plus className="w-4 h-4" />
                  Add Section
                </button>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors btn-lift"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => {
                if (item.itemType === "SECTION") {
                  return (
                    <SectionRow
                      key={item.id}
                      item={item}
                      isFirst={index === 0}
                      isLast={index === items.length - 1}
                      onChange={(v) => updateItem(item.id, "description", v)}
                      onMove={(dir) => moveItem(index, dir)}
                      onRemove={() => removeItem(item.id)}
                    />
                  );
                }
                const srNo = items.slice(0, index + 1).filter((i) => i.itemType !== "SECTION").length;
                return (
                  <LineItemCard
                    key={item.id}
                    item={item}
                    srNo={srNo}
                    products={products}
                    line={totals.lineTotals[index] ?? { baseAmount: 0, gstAmount: 0, lineTotal: 0 }}
                    isFirst={index === 0}
                    isLast={index === items.length - 1}
                    onChange={(field, value) => updateItem(item.id, field, value)}
                    onSelectProduct={(pid) => selectProduct(pid, item.id)}
                    onMove={(dir) => moveItem(index, dir)}
                    onRemove={() => removeItem(item.id)}
                  />
                );
              })}
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Notes & Terms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm resize-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</label>
                <textarea
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  placeholder="Terms and conditions..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm resize-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Summary */}
        <div className="space-y-6">
          <SummaryPanel
            totals={totals}
            values={summaryValues}
            onChange={(patch) => setForm({ ...form, ...patch })}
            itemCount={billableItems.length}
            optionalCount={optionalCount}
          />
        </div>
      </div>
    </div>
  );
}
