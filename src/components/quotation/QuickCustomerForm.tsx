"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

export interface CustomerOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  gstNumber?: string;
}

const input =
  "w-full px-3 py-2 bg-gray-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm transition-all";

export function QuickCustomerForm({
  onCreated,
  onCancel,
}: {
  onCreated: (customer: CustomerOption) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", address: "", gstNumber: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) {
      alert("Customer name is required");
      return;
    }
    setSaving(true);
    try {
      const c = await apiFetch<CustomerOption>("/api/customers", {
        method: "POST",
        body: JSON.stringify({ ...form, email: form.email || null }),
      });
      onCreated(c);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create customer");
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-indigo-500" /> New Customer
        </p>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg transition-colors" title="Cancel">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} placeholder="Customer name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
          <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={input} placeholder="Company name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} placeholder="+91..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} placeholder="email@example.com" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">GST Number</label>
          <input type="text" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} className={input} placeholder="29ABCDE1234F1Z5" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
          <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={input} placeholder="City, State" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md shadow-indigo-200/50 btn-lift disabled:opacity-50">
          {saving ? "Saving..." : "Save Customer"}
        </button>
      </div>
    </div>
  );
}
