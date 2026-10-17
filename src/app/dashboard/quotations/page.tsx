"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  FileText,
  Eye,
  Edit3,
  Trash2,
  Download,
  Send,
  CheckCircle,
  Clock,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiFetch, getStoredUser } from "@/lib/api";
import { calcQuotationTotals } from "@/lib/calc";
import { generateQuotationPdf } from "@/lib/pdf";
import { fetchCompanySettings } from "@/lib/settings";

interface QuoteItem {
  itemType?: string;
  description: string;
  quantity: number;
  rate: number;
  discount: number;
  gstRate: number;
  isOptional?: boolean;
}

interface Quotation {
  id: string;
  quoteNumber: string;
  title: string;
  status: string;
  revision: number;
  createdAt: string;
  grandTotal?: number;
  subtotal?: number;
  gstAmount?: number;
  discountAmount?: number;
  discountType?: string;
  discountValue?: number;
  additionalCharges?: number;
  shippingCharges?: number;
  installationCharge?: number;
  customer: { name: string; company?: string };
  user?: { name: string; email: string };
  items: QuoteItem[];
  rejectionReason?: string | null;
}

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  draft: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock, label: "Draft" },
  internal_review: { color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: Clock, label: "Internal Review" },
  approved: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle, label: "Approved" },
  sent: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Send, label: "Sent" },
  follow_up: { color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: Clock, label: "Follow Up" },
  negotiation: { color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Edit3, label: "Negotiation" },
  won: { color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle, label: "Won" },
  lost: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: X, label: "Lost" },
  expired: { color: "text-gray-600", bg: "bg-gray-100 border-gray-200", icon: Clock, label: "Expired" },
  cancelled: { color: "text-gray-600", bg: "bg-gray-100 border-gray-200", icon: X, label: "Cancelled" },
  rejected: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: X, label: "Rejected" },
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("sales_person");

  useEffect(() => {
    apiFetch<Quotation[]>("/api/quotations")
      .then((data) => {
        const u = getStoredUser();
        if (u?.role) setUserRole(u.role);
        setQuotations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    try {
      await apiFetch(`/api/quotations/${id}`, { method: "DELETE" });
      setQuotations((prev) => prev.filter((q) => q.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const filtered = quotations.filter((q) => {
    const matchSearch =
      q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusTotal = (q: Quotation) => {
    if (typeof q.grandTotal === "number") return Math.round(q.grandTotal);
    return calcQuotationTotals({
      items: q.items,
      discountType: q.discountType,
      discountValue: q.discountValue,
      additionalCharges: q.additionalCharges,
      shippingCharges: q.shippingCharges,
      installationCharge: q.installationCharge,
    }).grandTotalRounded;
  };

  const statusCounts: Record<string, number> = { all: quotations.length };
  quotations.forEach((q) => {
    statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
  });
  const activeStatuses = Object.keys(statusConfig).filter(
    (s) => statusCounts[s] || s === "draft" || s === "sent" || s === "approved"
  );

  const quickDownload = async (q: Quotation) => {
    try {
      const full = await apiFetch<{
        quoteNumber: string;
        title: string;
        description?: string;
        quoteDate?: string;
        validTill?: string;
        discountType: string;
        discountValue: number;
        additionalCharges: number;
        shippingCharges: number;
        installationCharge: number;
        notes?: string;
        terms?: string;
        status: string;
        revision: number;
        projectName?: string | null;
        projectRef?: string | null;
        siteAddress?: string | null;
        contactPerson?: string | null;
        phone?: string | null;
        email?: string | null;
        preparedBy?: string | null;
        paymentTerms?: string | null;
        deliveryTimeline?: string | null;
        warranty?: string | null;
        installationScope?: string | null;
        exclusions?: string | null;
        assumptions?: string | null;
        technicalNotes?: string | null;
        authorizedSignatory?: string | null;
        createdAt: string;
        customer: Quotation["customer"] & { email?: string; phone?: string; address?: string; gstNumber?: string };
        user?: { name?: string | null; email?: string | null; phone?: string | null };
        items: QuoteItem[];
      }>(`/api/quotations/${q.id}`);
      const settings = await fetchCompanySettings();
      const certificates = settings.includeCertificates
        ? (settings.assets || [])
            .filter((a) => a.type === "certificate")
            .map((a) => ({ name: a.name, url: a.path }))
        : [];
      await generateQuotationPdf(
        {
          quoteNumber: full.quoteNumber,
          title: full.title,
          description: full.description,
          status: full.status,
          quoteDate: full.quoteDate || full.createdAt,
          validTill: full.validTill,
          discountType: full.discountType,
          discountValue: full.discountValue,
          additionalCharges: full.additionalCharges,
          shippingCharges: full.shippingCharges,
          installationCharge: full.installationCharge,
          notes: full.notes,
          terms: full.terms,
          projectName: full.projectName,
          projectRef: full.projectRef,
          siteAddress: full.siteAddress,
          contactPerson: full.contactPerson,
          phone: full.phone,
          email: full.email,
          preparedBy: full.preparedBy,
          paymentTerms: full.paymentTerms,
          deliveryTimeline: full.deliveryTimeline,
          warranty: full.warranty,
          installationScope: full.installationScope,
          exclusions: full.exclusions,
          assumptions: full.assumptions,
          technicalNotes: full.technicalNotes,
          authorizedSignatory: full.authorizedSignatory,
          revision: full.revision,
          customer: full.customer,
          items: full.items,
          user: full.user,
        },
        settings,
        { includeCertificates: certificates.length > 0, certificates }
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to download PDF");
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8 animate-fadeIn">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Quotations</h1>
          <p className="text-gray-500 mt-1.5">Manage all your quotations</p>
        </div>
        <Link
          href="/dashboard/quotations/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md shadow-indigo-200/50 btn-lift"
        >
          <Plus className="w-5 h-5" />
          New Quotation
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all flex-1">
            <div className="flex items-center justify-center w-10 flex-shrink-0">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by quote number, title, or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            >
              <option value="all">All Status ({statusCounts.all})</option>
              {activeStatuses.map((s) => (
                <option key={s} value={s}>
                  {statusConfig[s].label} ({statusCounts[s] || 0})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 text-lg font-medium">No quotations found</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">Create your first quotation to get started</p>
          <Link
            href="/dashboard/quotations/new"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Create Quotation
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quote</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  {userRole === "admin" && (
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sales Person</th>
                  )}
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rev</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((q) => {
                  const config = statusConfig[q.status] || statusConfig.draft;
                  const StatusIcon = config.icon;
                  return (
                    <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{q.quoteNumber}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{q.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{q.customer?.name}</p>
                        <p className="text-xs text-gray-500">{q.customer?.company}</p>
                      </td>
                      {userRole === "admin" && (
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{q.user?.name || "N/A"}</p>
                          <p className="text-xs text-gray-500">{q.user?.email}</p>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center">v{q.revision}</td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(getStatusTotal(q))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(q.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/quotations/${q.id}`} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link href={`/dashboard/quotations/${q.id}/edit`} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </Link>
                          <button onClick={() => handleDelete(q.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => quickDownload(q)}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
