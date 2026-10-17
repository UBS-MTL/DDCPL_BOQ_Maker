import { apiFetch } from "@/lib/api";

export type CompanyAsset = {
  id: string;
  type: string;
  name: string;
  path: string;
};

export type CompanySettings = {
  companyName?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  panNumber?: string | null;
  cinNumber?: string | null;
  website?: string;
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
  currency?: string;
  defaultGstRate?: number;
  defaultValidityDays?: number;
  defaultTerms?: string | null;
  defaultNotes?: string | null;
  quoteNumberPrefix?: string;
  reminderDays?: string;
  requireApproval?: boolean;
  includeCertificates?: boolean;
  assets?: CompanyAsset[];
  isoLogoPath?: string | null;
  memberLogoPath?: string | null;
};

type SettingsResponse = CompanySettings & {
  companyName: string;
  logoPath?: string | null;
  signaturePath?: string | null;
};

export const DEFAULT_COMPANY: CompanySettings = {
  companyName: "Your Company Name",
  address: "123 Business Park, Mumbai 400001",
  phone: "+91 98765 43210",
  email: "info@yourcompany.com",
  gstNumber: "27AABCU9603R1ZM",
  website: "www.yourcompany.com",
};

export function getCompanySettings(): CompanySettings {
  if (typeof window === "undefined") return DEFAULT_COMPANY;
  try {
    const stored = localStorage.getItem("ddcpl_settings");
    if (stored) {
      const data = JSON.parse(stored);
      const c = data.company;
      if (c) {
        return {
          companyName: c.name || c.companyName || DEFAULT_COMPANY.companyName,
          address: c.address ?? DEFAULT_COMPANY.address,
          phone: c.phone ?? DEFAULT_COMPANY.phone,
          email: c.email ?? DEFAULT_COMPANY.email,
          gstNumber: c.gstNumber ?? DEFAULT_COMPANY.gstNumber,
          panNumber: c.panNumber,
          cinNumber: c.cinNumber,
          website: c.website ?? DEFAULT_COMPANY.website,
          instagramUrl: c.instagramUrl,
          linkedinUrl: c.linkedinUrl,
          bankName: c.bankName,
          bankAccountName: c.bankAccountName,
          bankAccountNumber: c.bankAccountNumber,
          bankIfsc: c.bankIfsc,
          bankBranch: c.bankBranch,
          bankUpiId: c.bankUpiId,
          bankQrPath: c.bankQrPath,
          logoPath: c.logoPath,
          signaturePath: c.signaturePath,
        };
      }
    }
  } catch {
    /* noop */
  }
  return DEFAULT_COMPANY;
}

function mirrorToLocal(settings: CompanySettings) {
  try {
    localStorage.setItem(
      "ddcpl_settings",
      JSON.stringify({
        company: {
          name: settings.companyName,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          gstNumber: settings.gstNumber,
          panNumber: settings.panNumber,
          cinNumber: settings.cinNumber,
          website: settings.website,
          instagramUrl: settings.instagramUrl,
          linkedinUrl: settings.linkedinUrl,
          bankName: settings.bankName,
          bankAccountName: settings.bankAccountName,
          bankAccountNumber: settings.bankAccountNumber,
          bankIfsc: settings.bankIfsc,
          bankBranch: settings.bankBranch,
          bankUpiId: settings.bankUpiId,
          bankQrPath: settings.bankQrPath,
          logoPath: settings.logoPath,
          signaturePath: settings.signaturePath,
        },
        defaults: {
          gstRate: settings.defaultGstRate,
          validityDays: settings.defaultValidityDays,
          defaultTerms: settings.defaultTerms,
          defaultNotes: settings.defaultNotes,
        },
      })
    );
  } catch {
    /* noop */
  }
}

export async function fetchCompanySettings(): Promise<CompanySettings> {
  try {
    const s = await apiFetch<SettingsResponse>("/api/settings");
    const mapped: CompanySettings = {
      companyName: s.companyName || DEFAULT_COMPANY.companyName,
      address: s.address ?? DEFAULT_COMPANY.address,
      phone: s.phone ?? DEFAULT_COMPANY.phone,
      email: s.email ?? DEFAULT_COMPANY.email,
      gstNumber: s.gstNumber ?? DEFAULT_COMPANY.gstNumber,
      panNumber: s.panNumber ?? null,
      cinNumber: s.cinNumber ?? null,
      website: s.website ?? DEFAULT_COMPANY.website,
      instagramUrl: s.instagramUrl ?? null,
      linkedinUrl: s.linkedinUrl ?? null,
      bankName: s.bankName ?? null,
      bankAccountName: s.bankAccountName ?? null,
      bankAccountNumber: s.bankAccountNumber ?? null,
      bankIfsc: s.bankIfsc ?? null,
      bankBranch: s.bankBranch ?? null,
      bankUpiId: s.bankUpiId ?? null,
      bankQrPath: s.bankQrPath ?? null,
      logoPath: s.logoPath,
      signaturePath: s.signaturePath,
      currency: s.currency,
      defaultGstRate: s.defaultGstRate,
      defaultValidityDays: s.defaultValidityDays,
      defaultTerms: s.defaultTerms,
      defaultNotes: s.defaultNotes,
      quoteNumberPrefix: s.quoteNumberPrefix,
      reminderDays: s.reminderDays,
      requireApproval: s.requireApproval,
      includeCertificates: s.includeCertificates,
      assets: s.assets,
      isoLogoPath: s.assets?.find((a) => a.type === "iso_badge")?.path ?? null,
      memberLogoPath: s.assets?.find((a) => a.type === "member_badge")?.path ?? null,
    };
    mirrorToLocal(mapped);
    return mapped;
  } catch {
    return getCompanySettings();
  }
}
