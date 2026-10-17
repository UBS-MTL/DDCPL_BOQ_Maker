"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Users,
  Edit3,
  Trash2,
  X,
  Mail,
  Phone,
  Building2,
  MapPin,
} from "lucide-react";
import { apiFetch, getStoredUser } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  gstNumber?: string;
  _count?: { quotations: number };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    gstNumber: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const isAdmin = getStoredUser()?.role === "admin";

  useEffect(() => {
    apiFetch<Customer[]>("/api/customers").then(setCustomers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", company: "", address: "", gstNumber: "" });
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      company: c.company || "",
      address: c.address || "",
      gstNumber: c.gstNumber || "",
    });
    setShowModal(true);
  };

  const save = async () => {
    setError("");
    try {
      const url = editing ? `/api/customers/${editing.id}` : "/api/customers";
      const method = editing ? "PUT" : "POST";
      const data = await apiFetch<Customer>(url, { method, body: JSON.stringify(form) });
      if (editing) {
        setCustomers(customers.map((c) => (c.id === editing.id ? { ...data, _count: c._count } : c)));
      } else {
        setCustomers([data, ...customers]);
      }
      setShowModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    try {
      await apiFetch(`/api/customers/${id}`, { method: "DELETE" });
      setCustomers(customers.filter((c) => c.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8 animate-fadeIn">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Customers</h1>
          <p className="text-gray-500 mt-1.5">Manage your customer database</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md shadow-indigo-200/50 btn-lift"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
          <div className="flex items-center justify-center w-10 flex-shrink-0">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search customers by name, company, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
        <span>{filtered.length} customers</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
        {filtered.map((customer) => (
          <div
            key={customer.id}
            className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-200/50 group-hover:scale-105 transition-transform">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(customer)}
                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-0.5">{customer.name}</h3>
            {customer.company && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-2">
                <Building2 className="w-3.5 h-3.5 text-gray-400" /> {customer.company}
              </p>
            )}
            <div className="space-y-1 mb-3">
              {customer.email && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-gray-400" /> <span className="truncate">{customer.email}</span>
                </p>
              )}
              {customer.phone && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-gray-400" /> {customer.phone}
                </p>
              )}
              {customer.address && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" /> <span className="truncate">{customer.address}</span>
                </p>
              )}
            </div>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {customer._count?.quotations || 0} quotations
              </span>
              {customer.gstNumber && (
                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-md text-gray-500 font-mono">
                  {customer.gstNumber}
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
            <Users className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 text-lg font-medium">No customers found</p>
          <p className="text-gray-400 text-sm mt-1">Add your first customer to get started</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slideIn">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? "Edit Customer" : "Add Customer"}</h2>
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
                  placeholder="Customer name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                    placeholder="email@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Company</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none transition-all"
                  placeholder="Full address"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">GST Number</label>
                <input
                  type="text"
                  value={form.gstNumber}
                  onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                  placeholder="27AABCU9603R1ZM"
                />
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
                {editing ? "Update" : "Create"} Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
