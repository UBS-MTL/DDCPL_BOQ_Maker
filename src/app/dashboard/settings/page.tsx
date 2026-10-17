"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Save,
  Upload,
  Palette,
  CheckCircle,
  Trash2,
  FileText,
  ShieldCheck,
  Landmark,
} from "lucide-react";
import { getStoredUser, apiFetch, uploadFile } from "@/lib/api";

type Asset = { id: string; type: string; name: string; path: string };

const defaultCompany = {
  name: "",
  address: "",
  phone: "",
  email: "",
  gstNumber: "",
  panNumber: "",
  cinNumber: "",
  website: "",
  instagramUrl: "",
  linkedinUrl: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  bankBranch: "",
  bankUpiId: "",
  bankQrPath: "",
  logoPath: "",
  signaturePath: "",
};

const defaultDefaults = {
  gstRate: 18,
  validityDays: 30,
  defaultTerms:
    "1. This quotation is valid for 30 days from the date of issue.\n2. Payment terms: 50% advance, 50% on delivery.\n3. Prices are inclusive of GST unless otherwise stated.\n4. Delivery within 2-3 weeks from the date of order confirmation.",
  defaultNotes: "",
};

export default function SettingsPage() {
  const router = useRouter();
  const [company, setCompany] = useState(defaultCompany);
  const [defaults, setDefaults] = useState(defaultDefaults);
  const [includeCertificates, setIncludeCertificates] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [logoKey, setLogoKey] = useState(0);
  const [sigKey, setSigKey] = useState(0);
  const [qrKey, setQrKey] = useState(0);
  const [isoPath, setIsoPath] = useState("");
  const [memberPath, setMemberPath] = useState("");
  const [isoKey, setIsoKey] = useState(0);
  const [memberKey, setMemberKey] = useState(0);
  const logoInput = useRef<HTMLInputElement>(null);
  const sigInput = useRef<HTMLInputElement>(null);
  const certInput = useRef<HTMLInputElement>(null);
  const isoInput = useRef<HTMLInputElement>(null);
  const memberInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.push("/login");
      return;
    }
    if (u.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    apiFetch<{
      companyName: string;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      gstNumber?: string | null;
      panNumber?: string | null;
      cinNumber?: string | null;
      website?: string | null;
      instagramUrl?: string | null;
      linkedinUrl?: string | null;
      bankName?: string | null;
      bankAccountName?: string | null;
      bankAccountNumber?: string | null;
      bankIfsc?: string | null;
      bankBranch?: string | null;
      bankUpiId?: string | null;
      bankQrPath?: string | null;
      logoPath?: string | null;
      signaturePath?: string | null;
      defaultGstRate: number;
      defaultValidityDays: number;
      defaultTerms?: string | null;
      defaultNotes?: string | null;
      includeCertificates: boolean;
      requireApproval: boolean;
      assets: Asset[];
    }>("/api/settings")
      .then((s) => {
        setCompany({
          name: s.companyName,
          address: s.address || "",
          phone: s.phone || "",
          email: s.email || "",
          gstNumber: s.gstNumber || "",
          panNumber: s.panNumber || "",
          cinNumber: s.cinNumber || "",
          website: s.website || "",
          instagramUrl: s.instagramUrl || "",
          linkedinUrl: s.linkedinUrl || "",
          bankName: s.bankName || "",
          bankAccountName: s.bankAccountName || "",
          bankAccountNumber: s.bankAccountNumber || "",
          bankIfsc: s.bankIfsc || "",
          bankBranch: s.bankBranch || "",
          bankUpiId: s.bankUpiId || "",
          bankQrPath: s.bankQrPath || "",
          logoPath: s.logoPath || "",
          signaturePath: s.signaturePath || "",
        });
        setDefaults({
          gstRate: s.defaultGstRate,
          validityDays: s.defaultValidityDays,
          defaultTerms: s.defaultTerms || "",
          defaultNotes: s.defaultNotes || "",
        });
        setIncludeCertificates(s.includeCertificates);
        setRequireApproval(s.requireApproval);
        setAssets(s.assets || []);
        setIsoPath(s.assets?.find((a) => a.type === "iso_badge")?.path || "");
        setMemberPath(s.assets?.find((a) => a.type === "member_badge")?.path || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleUpload = async (file: File, type: "logo" | "signature" | "bank_qr") => {
    setUploading(true);
    try {
      const res = await uploadFile(file, type);
      if (type === "logo") {
        setCompany((c) => ({ ...c, logoPath: res.path }));
        setLogoKey((k) => k + 1);
      } else if (type === "bank_qr") {
        setCompany((c) => ({ ...c, bankQrPath: res.path }));
        setQrKey((k) => k + 1);
      } else {
        setCompany((c) => ({ ...c, signaturePath: res.path }));
        setSigKey((k) => k + 1);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCertUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadFile<{ path: string; name: string; assetId: string | null }>(
        file,
        "certificate"
      );
      if (res.assetId) {
        setAssets((prev) => [
          ...prev,
          { id: res.assetId as string, type: "certificate", name: res.name, path: res.path },
        ]);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleBadgeUpload = async (file: File, type: "iso_badge" | "member_badge") => {
    setUploading(true);
    try {
      const res = await uploadFile<{ path: string; assetId: string | null }>(file, type);
      if (type === "iso_badge") {
        setIsoPath(res.path);
        setIsoKey((k) => k + 1);
      } else {
        setMemberPath(res.path);
        setMemberKey((k) => k + 1);
      }
      if (res.assetId) {
        setAssets((prev) => {
          const others = prev.filter((a) => a.type !== type);
          return [
            ...others,
            {
              id: res.assetId as string,
              type,
              name: type === "iso_badge" ? "ISO Badge" : "Member Badge",
              path: res.path,
            },
          ];
        });
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeBadge = async (type: "iso_badge" | "member_badge") => {
    const asset = assets.find((a) => a.type === type);
    if (asset) {
      try {
        await apiFetch(`/api/assets/${asset.id}`, { method: "DELETE" });
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      } catch {
        /* best effort */
      }
    }
    if (type === "iso_badge") {
      setIsoPath("");
      setIsoKey((k) => k + 1);
    } else {
      setMemberPath("");
      setMemberKey((k) => k + 1);
    }
  };

  const removeCert = async (id: string) => {
    if (!confirm("Remove this certificate?")) return;
    try {
      await apiFetch(`/api/assets/${id}`, { method: "DELETE" });
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        companyName: company.name || "Your Company Name",
        address: company.address || null,
        phone: company.phone || null,
        email: company.email || null,
        gstNumber: company.gstNumber || null,
        panNumber: company.panNumber || null,
        cinNumber: company.cinNumber || null,
        website: company.website || null,
        instagramUrl: company.instagramUrl || null,
        linkedinUrl: company.linkedinUrl || null,
        bankName: company.bankName || null,
        bankAccountName: company.bankAccountName || null,
        bankAccountNumber: company.bankAccountNumber || null,
        bankIfsc: company.bankIfsc || null,
        bankBranch: company.bankBranch || null,
        bankUpiId: company.bankUpiId || null,
        bankQrPath: company.bankQrPath || null,
        logoPath: company.logoPath || null,
        signaturePath: company.signaturePath || null,
        defaultGstRate: defaults.gstRate,
        defaultValidityDays: defaults.validityDays,
        defaultTerms: defaults.defaultTerms || null,
        defaultNotes: defaults.defaultNotes || null,
        includeCertificates,
        requireApproval,
      };
      await apiFetch("/api/settings", { method: "PUT", body: JSON.stringify(payload) });
      try {
        localStorage.setItem(
          "ddcpl_settings",
          JSON.stringify({ company: { ...company, name: payload.companyName }, defaults })
        );
      } catch {
        /* noop */
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const certificates = assets.filter((a) => a.type === "certificate");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-1.5">Configure your quotation system</p>
      </div>

      <div className="space-y-6">
        {/* Company Details */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-indigo-500" />
            </div>
            Company Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50/80 rounded-2xl border border-dashed border-gray-300 hover:border-indigo-400 transition-colors cursor-pointer group"
              onClick={() => logoInput.current?.click()}
            >
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-gray-200 overflow-hidden shadow-sm">
                {company.logoPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={logoKey}
                    src={company.logoPath}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Upload className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Company Logo</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {uploading ? "Uploading…" : "PNG, JPG, SVG (max 2MB)"}
                </p>
              </div>
              <input
                ref={logoInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f, "logo");
                  e.target.value = "";
                }}
              />
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50/80 rounded-2xl border border-dashed border-gray-300 hover:border-indigo-400 transition-colors cursor-pointer group"
              onClick={() => sigInput.current?.click()}
            >
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-gray-200 overflow-hidden shadow-sm">
                {company.signaturePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={sigKey}
                    src={company.signaturePath}
                    alt="Signature"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Upload className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Signatory Stamp</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {uploading ? "Uploading…" : "PNG, JPG (max 1MB)"}
                </p>
              </div>
              <input
                ref={sigInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f, "signature");
                  e.target.value = "";
                }}
              />
            </div>

            <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200">
              <div className="flex items-start gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Approvals</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Internal review requires admin approval
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                Require approval before sending
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={includeCertificates}
                  onChange={(e) => setIncludeCertificates(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                Attach certificates to PDF
              </label>
            </div>
          </div>

          {/* Header badges (ISO / member logos shown on PDF header) */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-1">PDF Header Badges</p>
            <p className="text-xs text-gray-500 mb-4">
              Optional — e.g. ISO certificate or CEDIA / member logos. Shown top-right on the PDF header.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50/80 rounded-2xl border border-dashed border-gray-300 hover:border-indigo-400 transition-colors cursor-pointer group"
                onClick={() => isoInput.current?.click()}
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-gray-200 overflow-hidden shadow-sm">
                  {isoPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={isoKey} src={isoPath} alt="ISO Badge" className="w-full h-full object-contain" />
                  ) : (
                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700">ISO / Certificate Logo</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {uploading ? "Uploading…" : "PNG, JPG (max 1MB)"}
                  </p>
                </div>
                {isoPath && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeBadge("iso_badge"); }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <input
                  ref={isoInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleBadgeUpload(f, "iso_badge");
                    e.target.value = "";
                  }}
                />
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50/80 rounded-2xl border border-dashed border-gray-300 hover:border-indigo-400 transition-colors cursor-pointer group"
                onClick={() => memberInput.current?.click()}
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-gray-200 overflow-hidden shadow-sm">
                  {memberPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={memberKey} src={memberPath} alt="Member Badge" className="w-full h-full object-contain" />
                  ) : (
                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700">Member / Association Logo</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {uploading ? "Uploading…" : "PNG, JPG (max 1MB)"}
                  </p>
                </div>
                {memberPath && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeBadge("member_badge"); }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <input
                  ref={memberInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleBadgeUpload(f, "member_badge");
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
              <input type="text" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
              <textarea value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} rows={2} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
              <input type="text" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">GST Number</label>
              <input type="text" value={company.gstNumber} onChange={(e) => setCompany({ ...company, gstNumber: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none font-mono transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">PAN Number</label>
              <input type="text" value={company.panNumber} onChange={(e) => setCompany({ ...company, panNumber: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none font-mono transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">CIN Number</label>
              <input type="text" value={company.cinNumber} onChange={(e) => setCompany({ ...company, cinNumber: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none font-mono transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Website</label>
              <input type="text" value={company.website} onChange={(e) => setCompany({ ...company, website: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Instagram URL</label>
              <input type="text" placeholder="https://instagram.com/yourcompany" value={company.instagramUrl} onChange={(e) => setCompany({ ...company, instagramUrl: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">LinkedIn URL</label>
              <input type="text" placeholder="https://linkedin.com/company/yourcompany" value={company.linkedinUrl} onChange={(e) => setCompany({ ...company, linkedinUrl: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center">
                <Landmark className="w-4 h-4 text-sky-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 leading-tight">Bank Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">Shown in the Bank Details box on quotation PDFs</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Account Name</label>
                <input type="text" placeholder="e.g., Dimension Digital Controlls PVT. LTD." value={company.bankAccountName} onChange={(e) => setCompany({ ...company, bankAccountName: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bank Name</label>
                <input type="text" value={company.bankName} onChange={(e) => setCompany({ ...company, bankName: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number</label>
                <input type="text" value={company.bankAccountNumber} onChange={(e) => setCompany({ ...company, bankAccountNumber: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none font-mono transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">IFSC</label>
                <input type="text" value={company.bankIfsc} onChange={(e) => setCompany({ ...company, bankIfsc: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none font-mono transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Branch</label>
                <input type="text" value={company.bankBranch} onChange={(e) => setCompany({ ...company, bankBranch: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">UPI ID <span className="font-normal text-gray-400">(auto-generates payment QR)</span></label>
                <input type="text" placeholder="e.g., company@upi / 9876543210@ybl" value={company.bankUpiId} onChange={(e) => setCompany({ ...company, bankUpiId: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none font-mono transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">QR Code Photo <span className="font-normal text-gray-400">(optional — overrides UPI ID)</span></label>
                <div className="flex items-center gap-3">
                  {company.bankQrPath ? (
                    <img key={qrKey} src={company.bankQrPath} alt="Bank QR" className="w-16 h-16 object-contain bg-white border border-gray-200 rounded-lg p-1" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-50 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-[10px] text-gray-400 text-center px-1">No QR photo</div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""} text-indigo-600 bg-indigo-50 hover:bg-indigo-100`}>
                      {uploading ? "Uploading…" : company.bankQrPath ? "Replace Photo" : "Upload Photo"}
                      <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "bank_qr"); e.target.value = ""; }} />
                    </label>
                    {company.bankQrPath && (
                      <button type="button" onClick={() => setCompany((c) => ({ ...c, bankQrPath: "" }))} className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-gray-400">Upload your bank/PhonePe/Paytm merchant QR. If empty, a QR is generated from the UPI ID above.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Certificates */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-emerald-600" />
              </div>
              Certificates & Attachments
            </h2>
            <button
              onClick={() => certInput.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading…" : "Add Certificate"}
            </button>
            <input
              ref={certInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCertUpload(f);
                e.target.value = "";
              }}
            />
          </div>
          {certificates.length === 0 ? (
            <p className="text-sm text-gray-400">
              No certificates uploaded. They can be attached to quotation PDFs.
            </p>
          ) : (
            <ul className="space-y-2">
              {certificates.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={c.path}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      View
                    </a>
                    <button
                      onClick={() => removeCert(c.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Defaults */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
              <Palette className="w-4 h-4 text-purple-600" />
            </div>
            Quotation Defaults
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Default GST Rate (%)</label>
              <select value={defaults.gstRate} onChange={(e) => setDefaults({ ...defaults, gstRate: parseFloat(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all">
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Validity (Days)</label>
              <input type="number" value={defaults.validityDays} onChange={(e) => setDefaults({ ...defaults, validityDays: parseInt(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Default Terms & Conditions</label>
              <textarea value={defaults.defaultTerms} onChange={(e) => setDefaults({ ...defaults, defaultTerms: e.target.value })} rows={4} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Default Notes</label>
              <textarea value={defaults.defaultNotes} onChange={(e) => setDefaults({ ...defaults, defaultNotes: e.target.value })} rows={2} className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none transition-all" />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium animate-fadeIn">
              <CheckCircle className="w-4 h-4" /> Saved successfully
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md shadow-indigo-200/50 btn-lift disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
