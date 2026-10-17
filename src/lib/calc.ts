export type CalcItemInput = {
  itemType?: string;
  quantity: number;
  rate: number;
  discount?: number;
  gstRate?: number;
  installationRate?: number;
  isOptional?: boolean;
};

export type LineCalc = {
  baseAmount: number;
  gstAmount: number;
  lineTotal: number;
};

export type GstSlab = { rate: number; baseAmount: number; gstAmount: number };

export const DEFAULT_SERVICES_GST_RATE = 18;

export type QuotationTotals = {
  subtotal: number;
  totalGst: number;
  discountAmount: number;
  taxableValue: number;
  additionalCharges: number;
  shippingCharges: number;
  installationCharge: number;
  servicesGstRate: number;
  gstOnServices: number;
  grandTotal: number;
  grandTotalRounded: number;
  roundOff: number;
  gstBreakup: GstSlab[];
  lineTotals: LineCalc[];
};

export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type GstTaxType = "intra" | "inter" | "unknown";

export function gstTaxType(
  companyGst?: string | null,
  customerGst?: string | null
): GstTaxType {
  const stateCode = (g?: string | null) => {
    const s = (g || "").trim();
    return /^\d{2}/.test(s) ? s.slice(0, 2) : null;
  };
  const c = stateCode(companyGst);
  const u = stateCode(customerGst);
  if (c && u) return c === u ? "intra" : "inter";
  return "unknown";
}

export function calcLine(item: CalcItemInput): LineCalc {
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const disc = Math.min(Math.max(Number(item.discount) || 0, 0), 100);
  const gst = Math.min(Math.max(Number(item.gstRate) || 0, 0), 100);
  const base = round2(qty * rate * (1 - disc / 100));
  const gstAmt = round2((base * gst) / 100);
  return { baseAmount: base, gstAmount: gstAmt, lineTotal: round2(base + gstAmt) };
}

export function calcQuotationTotals(params: {
  items: CalcItemInput[];
  discountType?: string;
  discountValue?: number;
  additionalCharges?: number;
  shippingCharges?: number;
  installationCharge?: number;
  servicesGstRate?: number;
}): QuotationTotals {
  const billable = params.items.filter(
    (i) => i.itemType !== "SECTION" && !i.isOptional
  );

  const lineTotals = params.items.map((i) => calcLine(i));

  let subtotal = 0;
  let totalGst = 0;
  const slabMap = new Map<number, { baseAmount: number; gstAmount: number }>();

  billable.forEach((item) => {
    const line = calcLine(item);
    subtotal += line.baseAmount;
    totalGst += line.gstAmount;
    const rate = Math.min(Math.max(Number(item.gstRate) || 0, 0), 100);
    const slab = slabMap.get(rate) || { baseAmount: 0, gstAmount: 0 };
    slab.baseAmount = round2(slab.baseAmount + line.baseAmount);
    slab.gstAmount = round2(slab.gstAmount + line.gstAmount);
    slabMap.set(rate, slab);
  });

  subtotal = round2(subtotal);
  totalGst = round2(totalGst);

  const discountValue = Math.max(Number(params.discountValue) || 0, 0);
  let discountAmount =
    params.discountType === "fixed"
      ? Math.min(discountValue, subtotal)
      : round2((subtotal * Math.min(discountValue, 100)) / 100);
  discountAmount = round2(discountAmount);

  const additionalCharges = Math.max(Number(params.additionalCharges) || 0, 0);
  const shippingCharges = Math.max(Number(params.shippingCharges) || 0, 0);

  const taxableValue = round2(subtotal - discountAmount);

  const itemInstallation = billable.reduce(
    (sum, i) => sum + Math.max(Number(i.quantity) || 0, 0) * Math.max(Number(i.installationRate) || 0, 0),
    0
  );
  const flatInstallation = Math.max(Number(params.installationCharge) || 0, 0);
  const installationCharge = round2(flatInstallation + itemInstallation);
  const servicesGstRate = Math.min(
    Math.max(Number(params.servicesGstRate ?? DEFAULT_SERVICES_GST_RATE) || 0, 0),
    100
  );
  const gstOnServices = round2((installationCharge * servicesGstRate) / 100);

  const grandTotal = round2(
    taxableValue + totalGst + additionalCharges + shippingCharges + installationCharge + gstOnServices
  );
  const grandTotalRounded = Math.round(grandTotal);
  const roundOff = round2(grandTotalRounded - grandTotal);

  const gstBreakup: GstSlab[] = Array.from(slabMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([rate, v]) => ({
      rate,
      baseAmount: v.baseAmount,
      gstAmount: v.gstAmount,
    }));

  return {
    subtotal,
    totalGst,
    discountAmount,
    taxableValue,
    additionalCharges: round2(additionalCharges),
    shippingCharges: round2(shippingCharges),
    installationCharge: round2(installationCharge),
    servicesGstRate,
    gstOnServices,
    grandTotal,
    grandTotalRounded,
    roundOff,
    gstBreakup,
    lineTotals,
  };
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? " " + ONES[o] : "");
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let s = "";
  if (h) s += ONES[h] + " Hundred";
  if (rest) s += (h ? " " : "") + twoDigits(rest);
  return s;
}

export function numberToWordsIndian(amount: number): string {
  const n = Math.floor(Math.abs(round2(amount)));
  if (n === 0) return "Zero";

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(" ");
}

export function amountInWords(amount: number, currency = "INR"): string {
  const n = round2(amount);
  const rupees = Math.floor(Math.abs(n));
  const paise = Math.round((Math.abs(n) - rupees) * 100);
  const words = numberToWordsIndian(rupees);
  const prefix = currency === "INR" ? "Indian Rupees" : currency;
  let s = `${prefix} ${words}`;
  if (paise) s += ` and ${twoDigits(paise)} Paise`;
  return `${s} Only`;
}

/* ---------- Section grouping helpers (shared by detail page, PDF & Excel) ---------- */

export type SectionGroup<T> = {
  title: string;
  items: T[];
};

/** Clean a SECTION row description into a display title (no leading/trailing dashes or numbering). */
export function cleanSectionTitle(description: string): string {
  return description
    .replace(/^[—–-\s*]+/, "")
    .replace(/[—–-\s*]+$/, "")
    .replace(/^\s*\d+[\.)]\s*/, "")
    .trim();
}

/** Group line items by SECTION rows. Items before the first section form a leading group. */
export function groupItemsBySection<T extends { itemType?: string; description: string }>(
  items: T[]
): SectionGroup<T>[] {
  const groups: SectionGroup<T>[] = [];
  let current: SectionGroup<T> = { title: "", items: [] };
  for (const item of items) {
    if (item.itemType === "SECTION") {
      if (current.items.length > 0 || current.title) groups.push(current);
      current = {
        title: cleanSectionTitle(item.description) || "Section",
        items: [],
      };
    } else {
      current.items.push(item);
    }
  }
  if (current.items.length > 0 || current.title) groups.push(current);
  return groups;
}

/** Totals for one section's items (no quote-level discount/charges). */
export function sectionTotalsOf(items: CalcItemInput[]): {
  subtotal: number;
  gst: number;
  installation: number;
  gstOnInstallation: number;
  total: number;
  itemCount: number;
} {
  const t = calcQuotationTotals({ items });
  return {
    subtotal: t.subtotal,
    gst: t.totalGst,
    installation: t.installationCharge,
    gstOnInstallation: t.gstOnServices,
    total: t.grandTotalRounded,
    itemCount: items.filter((i) => i.itemType !== "SECTION" && !i.isOptional).length,
  };
}
