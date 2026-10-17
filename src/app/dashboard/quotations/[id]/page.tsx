"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Send,
  Edit3,
  CheckCircle,
  X,
  FileSpreadsheet,
  Copy,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GitBranch,
  ImageIcon,
  Landmark,
  LayoutGrid,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiFetch, getStoredUser } from "@/lib/api";
import { calcQuotationTotals, groupItemsBySection, sectionTotalsOf, cleanSectionTitle } from "@/lib/calc";
import { generateQuotationPdf } from "@/lib/pdf";
import { generateQuotationExcel } from "@/lib/excel";
import { getCompanySettings, fetchCompanySettings } from "@/lib/settings";

interface QuoteItem {
  id: string;
  itemType?: string;
  description: string;
  brand?: string | null;
  modelNumber?: string | null;
  specifications?: string | null;
  hsnCode?: string;
  unit: string;
  quantity: number;
  rate: number;
  discount: number;
  gstRate: number;
  installationRate?: number;
  isOptional?: boolean;
  product?: { image?: string | null } | null;
}

interface Quotation {
  id: string;
  quoteNumber: string;
  title: string;
  description?: string;
  status: string;
  revision: number;
  quoteDate?: string;
  validTill?: string;
  discountType: string;
  discountValue: number;
  additionalCharges: number;
  shippingCharges: number;
  installationCharge: number;
  taxExcluded: boolean;
  notes?: string;
  terms?: string;
  createdAt: string;
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
  followUpDate?: string | null;
  responseDeadline?: string | null;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: string;
    gstNumber?: string;
  };
  user: { name: string; email?: string; phone?: string | null };
  items: QuoteItem[];
  revisions: { id: string; revision: number; changeNotes?: string; createdAt: string }[];
  rejectionReason?: string | null;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  internal_review: { label: "Internal Review", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  approved: { label: "Approved", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  sent: { label: "Sent", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  follow_up: { label: "Follow Up", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  negotiation: { label: "Negotiation", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  won: { label: "Won", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  lost: { label: "Lost", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  expired: { label: "Expired", color: "text-gray-600", bg: "bg-gray-100 border-gray-200" },
  cancelled: { label: "Cancelled", color: "text-gray-600", bg: "bg-gray-100 border-gray-200" },
  rejected: { label: "Rejected", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

const STATUS_GROUPS: { title: string; statuses: string[] }[] = [
  { title: "Workflow", statuses: ["draft", "internal_review", "approved"] },
  { title: "Customer", statuses: ["sent", "follow_up", "negotiation"] },
  { title: "Outcome", statuses: ["won", "lost", "expired", "cancelled", "rejected"] },
];

const REASON_REQUIRED = new Set(["lost", "cancelled", "rejected"]);

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [withPhotos, setWithPhotos] = useState(false);
  const [withBank, setWithBank] = useState(true);
  const [viewMode, setViewMode] = useState<"combined" | "sections">("combined");
  const [activeSection, setActiveSection] = useState(0);
  const [userRole] = useState(() => getStoredUser()?.role || "sales_person");
  const isAdmin = userRole === "admin";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("boqWithPhotos") === "1";
      Promise.resolve().then(() => setWithPhotos(stored));
      const storedBank = localStorage.getItem("boqWithBank");
      Promise.resolve().then(() => setWithBank(storedBank !== "0"));
    }
    apiFetch<Quotation>(`/api/quotations/${params.id}`)
      .then((data) => {
        setQuote(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const togglePhotos = () => {
    const next = !withPhotos;
    setWithPhotos(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("boqWithPhotos", next ? "1" : "0");
    }
  };

  const toggleBank = () => {
    const next = !withBank;
    setWithBank(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("boqWithBank", next ? "1" : "0");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">Quotation not found</p>
        <Link href="/dashboard/quotations" className="text-indigo-600 mt-2 inline-block">
          Go back
        </Link>
      </div>
    );
  }

  const totals = calcQuotationTotals({
    items: quote.items,
    discountType: quote.discountType,
    discountValue: quote.discountValue,
    additionalCharges: quote.additionalCharges,
    shippingCharges: quote.shippingCharges,
    installationCharge: quote.installationCharge,
  });

  const meta = STATUS_META[quote.status] || STATUS_META.draft;
  const company = getCompanySettings();
  const billableItems = quote.items.filter((i) => i.itemType !== "SECTION");
  const srBy = (item: QuoteItem) => billableItems.findIndex((b) => b.id === item.id) + 1;

  const sectionGroups = groupItemsBySection(quote.items);
  const hasSections = quote.items.some((i) => i.itemType === "SECTION");
  const sectionTotals = sectionTotalsOf;
  const showSectionInstallCol = sectionGroups.some((g) => {
    const st = sectionTotals(g.items);
    return st.installation > 0 || st.gstOnInstallation > 0;
  });

  const downloadPDF = async () => {
    setExporting(true);
    try {
      const settings = await fetchCompanySettings();
      const certificates = settings.includeCertificates
        ? (settings.assets || [])
            .filter((a) => a.type === "certificate")
            .map((a) => ({ name: a.name, url: a.path }))
        : [];
      await generateQuotationPdf(
        {
          quoteNumber: quote.quoteNumber,
          title: quote.title,
          description: quote.description,
          status: quote.status,
          quoteDate: quote.quoteDate || quote.createdAt,
          validTill: quote.validTill,
          discountType: quote.discountType,
          discountValue: quote.discountValue,
          additionalCharges: quote.additionalCharges,
          shippingCharges: quote.shippingCharges,
          installationCharge: quote.installationCharge,
          notes: quote.notes,
          terms: quote.terms,
          projectName: quote.projectName,
          projectRef: quote.projectRef,
          siteAddress: quote.siteAddress,
          contactPerson: quote.contactPerson,
          phone: quote.phone,
          email: quote.email,
          preparedBy: quote.preparedBy,
          paymentTerms: quote.paymentTerms,
          deliveryTimeline: quote.deliveryTimeline,
          warranty: quote.warranty,
          installationScope: quote.installationScope,
          exclusions: quote.exclusions,
          assumptions: quote.assumptions,
          technicalNotes: quote.technicalNotes,
          authorizedSignatory: quote.authorizedSignatory,
          revision: quote.revision,
          customer: quote.customer,
          items: quote.items,
          user: quote.user,
        },
        settings,
        { includeCertificates: certificates.length > 0, certificates, includePhotos: withPhotos, includeBank: withBank, sections: viewMode === "sections" }
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  };

  const downloadExcel = async () => {
    setExporting(true);
    try {
      const settings = await fetchCompanySettings();
      await generateQuotationExcel(
        {
          quoteNumber: quote.quoteNumber,
          title: quote.title,
          description: quote.description,
          quoteDate: quote.quoteDate || quote.createdAt,
          validTill: quote.validTill,
          discountType: quote.discountType,
          discountValue: quote.discountValue,
          additionalCharges: quote.additionalCharges,
          shippingCharges: quote.shippingCharges,
          installationCharge: quote.installationCharge,
          notes: quote.notes,
          terms: quote.terms,
          projectName: quote.projectName,
          projectRef: quote.projectRef,
          siteAddress: quote.siteAddress,
          contactPerson: quote.contactPerson,
          phone: quote.phone,
          email: quote.email,
          preparedBy: quote.preparedBy,
          paymentTerms: quote.paymentTerms,
          deliveryTimeline: quote.deliveryTimeline,
          warranty: quote.warranty,
          installationScope: quote.installationScope,
          exclusions: quote.exclusions,
          assumptions: quote.assumptions,
          technicalNotes: quote.technicalNotes,
          authorizedSignatory: quote.authorizedSignatory,
          revision: quote.revision,
          status: quote.status,
          customer: quote.customer,
          user: quote.user,
          items: quote.items,
        },
        settings,
        { includePhotos: withPhotos, sections: viewMode === "sections" }
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to generate Excel");
    } finally {
      setExporting(false);
    }
  };

  const updateStatus = async (status: string, rejectionReason?: string, newRevision = false) => {
    let reason = rejectionReason;
    if (REASON_REQUIRED.has(status) && !reason) {
      const entered = window.prompt(`Reason for marking as ${STATUS_META[status]?.label || status}:`);
      if (entered === null || !entered.trim()) return;
      reason = entered.trim();
    }
    try {
      const payload: Record<string, unknown> = { status };
      if (reason) payload.rejectionReason = reason;
      if (newRevision) payload.newRevision = true;
      const updated = await apiFetch<Quotation>(`/api/quotations/${quote.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setQuote(updated);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update status");
    }
  };

  const createRevision = async () => {
    if (!window.confirm(`Create a new revision (v${quote.revision + 1}) for ${quote.quoteNumber}?`)) return;
    await updateStatus(quote.status, undefined, true);
  };

  const duplicate = async () => {
    setDuplicating(true);
    try {
      const copy = await apiFetch<{ id: string }>(`/api/quotations/${quote.id}/duplicate`, {
        method: "POST",
      });
      router.push(`/dashboard/quotations/${copy.id}/edit`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to duplicate quotation");
      setDuplicating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/quotations" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{quote.quoteNumber}</h1>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium">
                v{quote.revision}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${meta.bg} ${meta.color}`}>
                {meta.label}
              </span>
            </div>
            <p className="text-gray-500 mt-1.5 text-sm">{quote.title}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={downloadPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium disabled:opacity-50 btn-lift"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Working…" : "PDF"}
          </button>
          <button
            onClick={togglePhotos}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all btn-lift ${
              withPhotos
                ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
            title={withPhotos ? "BOQ exports include product photos — click to turn off" : "Click to include product photos in BOQ exports"}
          >
            <ImageIcon className="w-4 h-4" />
            Photos
          </button>
          <button
            onClick={toggleBank}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all btn-lift ${
              withBank
                ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 line-through decoration-gray-300"
            }`}
            title={withBank ? "PDF includes Bank Details — click to remove them" : "Click to include Bank Details in the PDF"}
          >
            <Landmark className="w-4 h-4" />
            Bank
          </button>
          <button
            onClick={downloadExcel}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium disabled:opacity-50 btn-lift"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={duplicate}
            disabled={duplicating}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium disabled:opacity-50 btn-lift"
          >
            <Copy className="w-4 h-4" />
            {duplicating ? "Copying…" : "Duplicate"}
          </button>
          <Link
            href={`/dashboard/quotations/${quote.id}/edit`}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium btn-lift"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </Link>
          <button
            onClick={createRevision}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-50 transition-all text-sm font-medium btn-lift"
            title="Create a new revision snapshot"
          >
            <GitBranch className="w-4 h-4" />
            New Revision
          </button>
          {quote.status === "draft" && (
            <button
              onClick={() => updateStatus("internal_review")}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all text-sm font-medium shadow-md shadow-indigo-200/50 btn-lift"
            >
              <Send className="w-4 h-4" />
              Submit for Review
            </button>
          )}
          {quote.status === "internal_review" && isAdmin && (
            <button
              onClick={() => updateStatus("approved")}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all text-sm font-medium shadow-md shadow-emerald-200/50 btn-lift"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
          )}
          {quote.status === "approved" && (
            <button
              onClick={() => updateStatus("sent")}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all text-sm font-medium shadow-md shadow-blue-200/50 btn-lift"
            >
              <Send className="w-4 h-4" />
              Mark Sent
            </button>
          )}
        </div>
      </div>

      {/* View mode toggle (only when quotation has sections) */}
      {hasSections && sectionGroups.length > 1 && (
        <div className="flex items-center justify-between gap-3 mb-4 bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm">
          <p className="text-sm text-gray-500">
            Viewing <span className="font-semibold text-gray-800">{sectionGroups.length}</span> solutions
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">View</span>
            <button
              onClick={() => setViewMode("combined")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                viewMode === "combined"
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
              title="All sections combined — used for PDF & Excel exports too"
            >
              <LayoutGrid className="w-4 h-4" />
              Combined
            </button>
            <button
              onClick={() => setViewMode("sections")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                viewMode === "sections"
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
              title="Each section on its own page + summary — used for PDF & Excel exports too"
            >
              <Layers className="w-4 h-4" />
              Section Pages
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quotation Preview */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Header Band */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{company.companyName || "Your Company Name"}</h2>
                  <p className="text-white/80 text-sm mt-1">{company.address}</p>
                  <p className="text-white/80 text-sm">
                    {company.phone} | {company.email}
                  </p>
                  <p className="text-white/60 text-xs mt-1">GST: {company.gstNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-sm">QUOTATION</p>
                  <p className="text-xl font-bold mt-1">{quote.quoteNumber}</p>
                  <p className="text-white/80 text-sm">{formatDate(quote.quoteDate || quote.createdAt)}</p>
                  {quote.validTill && (
                    <p className="text-white/60 text-xs mt-1">Valid till {formatDate(quote.validTill)}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* Bill To */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bill To</h3>
                  <p className="font-semibold text-gray-900 text-lg">{quote.customer.name}</p>
                  {quote.customer.company && (
                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                      <Building2 className="w-3 h-3" /> {quote.customer.company}
                    </p>
                  )}
                  {quote.customer.email && (
                    <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                      <Mail className="w-3 h-3" /> {quote.customer.email}
                    </p>
                  )}
                  {quote.customer.phone && (
                    <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" /> {quote.customer.phone}
                    </p>
                  )}
                  {quote.customer.address && (
                    <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {quote.customer.address}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${meta.bg} ${meta.color}`}
                  >
                    <span className="text-sm font-medium">{meta.label}</span>
                  </div>
                  {quote.projectName && (
                    <p className="text-sm text-gray-600 mt-3 font-medium">{quote.projectName}</p>
                  )}
                  {quote.siteAddress && (
                    <p className="text-xs text-gray-500 mt-1">Site: {quote.siteAddress}</p>
                  )}
                  {quote.followUpDate && (
                    <p className="text-sm text-indigo-600 mt-3 flex items-center justify-end gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Follow up: {formatDate(quote.followUpDate)}
                    </p>
                  )}
                </div>
              </div>

              {/* Items / Section pages */}
              {viewMode === "sections" && hasSections && sectionGroups.length > 0 ? (
                <div>
                  {/* Section tabs */}
                  <div className="flex gap-1 overflow-x-auto border-b border-gray-100 pb-px scrollbar-thin">
                    {sectionGroups.map((g, i) => {
                      const st = sectionTotals(g.items);
                      const active = activeSection === i;
                      return (
                        <button
                          key={i}
                          onClick={() => setActiveSection(i)}
                          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                            active
                              ? "border-indigo-500 text-indigo-700 bg-indigo-50/60"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold bg-indigo-100 text-indigo-600">
                            {i + 1}
                          </span>
                          <span className="max-w-[180px] truncate">{g.title}</span>
                          <span className="text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-full px-2 py-0.5 tabular-nums">
                            {formatCurrency(st.total)}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setActiveSection(sectionGroups.length)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        activeSection === sectionGroups.length
                          ? "border-emerald-500 text-emerald-700 bg-emerald-50/60"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold bg-emerald-100 text-emerald-600">
                        ✓
                      </span>
                      Summary
                    </button>
                  </div>

                  {/* Active section page or summary page */}
                  <div className="pt-6">
                    {activeSection < sectionGroups.length ? (
                      (() => {
                        const g = sectionGroups[activeSection];
                        const st = sectionTotals(g.items);
                        const showInstall = g.items.some((i) => (i.installationRate ?? 0) > 0);
                        const gstRates = new Set(
                          g.items.filter((i) => i.itemType !== "SECTION").map((i) => i.gstRate)
                        );
                        const gstLabel =
                          st.gst > 0 && gstRates.size === 1
                            ? `GST @ ${[...gstRates][0]}%`
                            : "GST";
                        let sr = 0;
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <span className="w-9 h-9 bg-indigo-500 text-white rounded-xl flex items-center justify-center text-sm font-bold">
                                  {activeSection + 1}
                                </span>
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">{g.title}</h3>
                                  <p className="text-xs text-gray-400">
                                    {g.items.filter((i) => !i.isOptional).length} item
                                    {g.items.filter((i) => !i.isOptional).length !== 1 ? "s" : ""}
                                    {g.items.some((i) => i.isOptional) &&
                                      ` · ${g.items.filter((i) => i.isOptional).length} optional`}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs text-gray-400">
                                Page {activeSection + 1} of {sectionGroups.length + 1}
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">HSN</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rate</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Disc</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GST</th>
                                    {showInstall && (
                                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Unit Installation</th>
                                    )}
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.items.map((item) => {
                                    const total = item.quantity * item.rate * (1 - item.discount / 100);
                                    sr += 1;
                                    return (
                                      <tr key={item.id} className="border-t border-gray-100">
                                        <td className="px-4 py-3 text-sm text-gray-500">{sr}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                          {item.description}
                                          {item.brand && <span className="text-gray-400 font-normal"> · {item.brand}</span>}
                                          {item.isOptional && (
                                            <span className="ml-2 text-xs font-semibold text-orange-600">OPTIONAL</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{item.hsnCode || "-"}</td>
                                        <td className="px-4 py-3 text-sm text-right">{item.quantity} {item.unit}</td>
                                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.rate)}</td>
                                        <td className="px-4 py-3 text-sm text-right">{item.discount}%</td>
                                        <td className="px-4 py-3 text-sm text-right">{item.gstRate}%</td>
                                        {showInstall && (
                                          <td className="px-4 py-3 text-sm text-right">
                                            {item.installationRate ? formatCurrency(item.installationRate) : "-"}
                                          </td>
                                        )}
                                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(total)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Section price */}
                            <div className="flex justify-end mt-5">
                              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3 text-right">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">
                                  Section Total (incl. GST)
                                </p>
                                <p className="text-2xl font-bold text-indigo-700 tabular-nums">{formatCurrency(st.total)}</p>
                                <p className="text-[11px] text-indigo-400 mt-0.5">
                                  {formatCurrency(st.subtotal)} + {gstLabel} {formatCurrency(st.gst)}
                                </p>
                                {st.installation > 0 && (
                                  <p className="text-[11px] text-indigo-400">
                                    + Installation {formatCurrency(st.installation)}
                                    {st.gstOnInstallation > 0 &&
                                      ` + GST @ ${totals.servicesGstRate}% ${formatCurrency(st.gstOnInstallation)}`}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Section nav */}
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                              <button
                                onClick={() => setActiveSection(activeSection - 1)}
                                disabled={activeSection === 0}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors btn-lift"
                              >
                                <ChevronLeft className="w-4 h-4" />
                                {activeSection > 0 ? sectionGroups[activeSection - 1].title : "Previous"}
                              </button>
                              <button
                                onClick={() => setActiveSection(activeSection + 1)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md shadow-indigo-200/50 btn-lift"
                              >
                                {activeSection + 1 < sectionGroups.length
                                  ? sectionGroups[activeSection + 1].title
                                  : "View Summary"}
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      /* ---- Summary page across all sections ---- */
                      <div>
                        <div className="flex items-center justify-between mb-5">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">Summary</h3>
                            <p className="text-xs text-gray-400">All sections at a glance</p>
                          </div>
                          <span className="text-xs text-gray-400">
                            Page {sectionGroups.length + 1} of {sectionGroups.length + 1}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Solution / Section</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Items</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GST</th>
                                {showSectionInstallCol && (
                                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                                    Installation (incl. GST)
                                  </th>
                                )}
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sectionGroups.map((g, i) => {
                                const st = sectionTotals(g.items);
                                return (
                                  <tr
                                    key={i}
                                    className="border-t border-gray-100 cursor-pointer hover:bg-indigo-50/40 transition-colors"
                                    onClick={() => setActiveSection(i)}
                                  >
                                    <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{g.title}</td>
                                    <td className="px-4 py-3 text-sm text-right text-gray-500">
                                      {g.items.filter((x) => !x.isOptional).length}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(st.subtotal)}</td>
                                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(st.gst)}</td>
                                    {showSectionInstallCol && (
                                      <td className="px-4 py-3 text-sm text-right">
                                        {st.installation + st.gstOnInstallation > 0
                                          ? formatCurrency(st.installation + st.gstOnInstallation)
                                          : "-"}
                                      </td>
                                    )}
                                    <td className="px-4 py-3 text-sm text-right font-bold text-indigo-700 tabular-nums">
                                      {formatCurrency(st.total)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Grand summary */}
                        <div className="flex justify-end mt-6">
                          <div className="w-80 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Subtotal + GST</span>
                              <span className="font-medium">{formatCurrency(totals.subtotal + totals.totalGst)}</span>
                            </div>
                            {totals.discountAmount > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Discount</span>
                                <span className="text-red-600">-{formatCurrency(totals.discountAmount)}</span>
                              </div>
                            )}
                            {totals.installationCharge > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Installation &amp; Integration</span>
                                <span>{formatCurrency(totals.installationCharge)}</span>
                              </div>
                            )}
                            {totals.gstOnServices > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">GST on Services @ {totals.servicesGstRate}%</span>
                                <span>{formatCurrency(totals.gstOnServices)}</span>
                              </div>
                            )}
                            {quote.shippingCharges > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Shipping</span>
                                <span>{formatCurrency(quote.shippingCharges)}</span>
                              </div>
                            )}
                            {quote.additionalCharges > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Additional</span>
                                <span>{formatCurrency(quote.additionalCharges)}</span>
                              </div>
                            )}
                            <div className="pt-3 border-t-2 border-indigo-200 flex justify-between">
                              <span className="text-lg font-bold text-gray-900">Grand Total</span>
                              <span className="text-xl font-bold text-indigo-600">
                                {formatCurrency(totals.grandTotalRounded)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => setActiveSection(sectionGroups.length - 1)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors btn-lift"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            {sectionGroups[sectionGroups.length - 1]?.title || "Back"}
                          </button>
                          <span className="text-xs text-gray-400">End of quotation</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {(() => {
                    const showInstall = quote.items.some(
                      (i) => i.itemType !== "SECTION" && (i.installationRate ?? 0) > 0
                    );
                    return (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">HSN</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rate</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Disc</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GST</th>
                        {showInstall && (
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Unit Installation</th>
                        )}
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.items.map((item) => {
                        if (item.itemType === "SECTION") {
                          return (
                            <tr key={item.id} className="border-t border-gray-100 bg-indigo-50/50">
                              <td colSpan={showInstall ? 9 : 8} className="px-4 py-3 text-base font-bold text-indigo-900">
                                {cleanSectionTitle(item.description) || item.description}
                              </td>
                            </tr>
                          );
                        }
                        const total = item.quantity * item.rate * (1 - item.discount / 100);
                        return (
                          <tr key={item.id} className="border-t border-gray-100">
                            <td className="px-4 py-3 text-sm text-gray-500">{srBy(item)}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {item.description}
                                {item.brand && (
                                  <span className="text-gray-400 font-normal"> · {item.brand}</span>
                                )}
                                {item.isOptional && (
                                  <span className="ml-2 text-xs font-semibold text-orange-600">OPTIONAL</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">{item.hsnCode || "-"}</td>
                              <td className="px-4 py-3 text-sm text-right">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.rate)}</td>
                              <td className="px-4 py-3 text-sm text-right">{item.discount}%</td>
                              <td className="px-4 py-3 text-sm text-right">{item.gstRate}%</td>
                              {showInstall && (
                                <td className="px-4 py-3 text-sm text-right">
                                  {item.installationRate ? formatCurrency(item.installationRate) : "-"}
                                </td>
                              )}
                              <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(total)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                    );
                  })()}
                </div>
              )}

              {/* Summary */}
              {!(viewMode === "sections" && hasSections) && (
              <div className="flex justify-end mt-6">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Discount</span>
                      <span className="text-red-600">-{formatCurrency(totals.discountAmount)}</span>
                    </div>
                  )}
                  {totals.installationCharge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Installation &amp; Integration</span>
                      <span>{formatCurrency(totals.installationCharge)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">GST</span>
                    <span>{formatCurrency(totals.totalGst)}</span>
                  </div>
                  {totals.gstOnServices > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">GST on Services @ {totals.servicesGstRate}%</span>
                      <span>{formatCurrency(totals.gstOnServices)}</span>
                    </div>
                  )}
                  {quote.shippingCharges > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Shipping</span>
                      <span>{formatCurrency(quote.shippingCharges)}</span>
                    </div>
                  )}
                  {quote.additionalCharges > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Additional</span>
                      <span>{formatCurrency(quote.additionalCharges)}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t-2 border-indigo-200 flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Grand Total</span>
                    <span className="text-xl font-bold text-indigo-600">
                      {formatCurrency(totals.grandTotalRounded)}
                    </span>
                  </div>
                </div>
              </div>
              )}

              {/* Notes & Terms */}
              {(quote.notes || quote.terms) && (
                <div className="mt-8 grid grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                  {quote.notes && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{quote.notes}</p>
                    </div>
                  )}
                  {quote.terms && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Terms & Conditions
                      </h4>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{quote.terms}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quotation Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sales Person</span>
                <span className="font-medium">{quote.user.name}</span>
              </div>
              {quote.user.email && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-xs">{quote.user.email}</span>
                </div>
              )}
              {quote.user.phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-medium text-xs">{quote.user.phone}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Items</span>
                <span className="font-medium">{quote.items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Revision</span>
                <span className="font-medium">v{quote.revision}</span>
              </div>
              {quote.followUpDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Follow Up</span>
                  <span className="font-medium text-indigo-600">{formatDate(quote.followUpDate)}</span>
                </div>
              )}
              {quote.responseDeadline && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Response By</span>
                  <span className="font-medium">{formatDate(quote.responseDeadline)}</span>
                </div>
              )}
              {quote.validTill && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Valid Till</span>
                  <span className="font-medium">{formatDate(quote.validTill)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Rejection Reason (only show if rejected) */}
          {quote.rejectionReason && (quote.status === "rejected" || quote.status === "lost" || quote.status === "cancelled") && (
            <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <X className="w-4 h-4" /> Reason
              </h3>
              <p className="text-sm text-red-700 leading-relaxed">{quote.rejectionReason}</p>
            </div>
          )}

          {/* Status Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Update Status</h3>
            <div className="space-y-4">
              {STATUS_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {group.title}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.statuses
                      .filter((s) => s !== "approved" || isAdmin)
                      .map((s) => {
                      const m = STATUS_META[s];
                      const active = quote.status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => updateStatus(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                            active
                              ? `${m.bg} ${m.color}`
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revision History */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Revision History</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">v{quote.revision} (current)</p>
                  <p className="text-xs text-gray-400">{formatDate(quote.createdAt)}</p>
                </div>
              </div>
              {(quote.revisions ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">No earlier revisions</p>
              ) : (
                (quote.revisions ?? []).map((r) => (
                  <div key={r.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">v{r.revision}</p>
                      <p className="text-xs text-gray-500">{r.changeNotes}</p>
                      <p className="text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
