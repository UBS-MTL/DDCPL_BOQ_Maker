import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { RowInput, Styles } from "jspdf-autotable";
import QRCode from "qrcode";
import {
  calcQuotationTotals,
  amountInWords,
  round2,
  gstTaxType,
  groupItemsBySection,
  sectionTotalsOf,
  DEFAULT_SERVICES_GST_RATE,
  cleanSectionTitle,
  type GstTaxType,
} from "@/lib/calc";
import { loadPhotoDataUrl } from "@/lib/images";

export type PdfCompany = {
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
  isoLogoPath?: string | null;
  memberLogoPath?: string | null;
};

export type PdfItem = {
  itemType?: string;
  description: string;
  brand?: string | null;
  modelNumber?: string | null;
  specifications?: string | null;
  hsnCode?: string | null;
  unit?: string;
  quantity: number;
  rate: number;
  discount: number;
  gstRate: number;
  installationRate?: number;
  isOptional?: boolean;
  product?: { image?: string | null } | null;
};

export type PdfQuotation = {
  quoteNumber: string;
  title: string;
  description?: string | null;
  status: string;
  quoteDate?: string | Date;
  validTill?: string | Date | null;
  discountType: string;
  discountValue: number;
  additionalCharges: number;
  shippingCharges: number;
  installationCharge?: number;
  notes?: string | null;
  terms?: string | null;
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
  revision?: number;
  customer?: {
    name: string;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    gstNumber?: string | null;
  } | null;
  items: PdfItem[];
  user?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export type PdfOptions = {
  currency?: string;
  includeCertificates?: boolean;
  certificates?: { name: string; url: string }[];
  includePhotos?: boolean;
  includeBank?: boolean;
  /** false = force combined single-table view even with multiple sections (default: auto-split). */
  sections?: boolean;
};

const MARGIN = 14;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;
const SUMMARY_W = 78;
const LEFT_COL_W = CONTENT_W - SUMMARY_W - 8;
const PAGE_BOTTOM = 278;
const GRAY: [number, number, number] = [75, 85, 99];
const BRAND: [number, number, number] = [2, 136, 209]; // sky-700 — company name
const ICON: [number, number, number] = [3, 105, 161]; // sky-600 — contact icons
const ECO: [number, number, number] = [22, 101, 52]; // green-800 — Save Paper Save Tree

/** Optional PNG/JPG icons loaded from /public/icons/*.png — vector fallback when missing. */
export type HeaderIconKind = "phone" | "mail" | "globe" | "instagram" | "linkedin";
export type HeaderIcons = Partial<Record<HeaderIconKind, string>>;

type IconKind = "phone" | "mail" | "globe" | "pin" | "instagram" | "linkedin";

function imgFormat(data: string): string {
  if (data.startsWith("data:image/png")) return "PNG";
  if (data.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

/** Draw an icon from /public/icons when available, otherwise fall back to the vector icon. */
function drawHeaderIcon(doc: jsPDF, kind: IconKind, x: number, y: number, icons: HeaderIcons) {
  const data = kind === "pin" ? undefined : icons[kind];
  if (data) {
    try {
      const props = doc.getImageProperties(data);
      const ratio = props.width / props.height || 1;
      const boxW = 3.2;
      const boxH = 3.2;
      let w = boxW;
      let h = w / ratio;
      if (h > boxH) {
        h = boxH;
        w = h * ratio;
      }
      doc.addImage(data, imgFormat(data), x + (boxW - w) / 2, y - 1.6 + (boxH - h) / 2, w, h);
      return;
    } catch {
      // fall through to vector icon
    }
  }
  drawIcon(doc, kind, x, y);
}

function drawIcon(doc: jsPDF, kind: IconKind, x: number, y: number) {
  doc.setDrawColor(...ICON);
  doc.setFillColor(...ICON);
  doc.setLineWidth(0.32);
  if (kind === "phone") {
    doc.roundedRect(x, y - 1.6, 2.5, 3.4, 0.4, 0.4, "F");
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x + 0.28, y - 1.28, 1.94, 2.4, 0.15, 0.15, "F");
    doc.setFillColor(...ICON);
    doc.rect(x + 0.85, y - 1.08, 1.0, 0.22, "F");
    doc.circle(x + 1.25, y + 0.85, 0.26, "F");
  } else if (kind === "mail") {
    doc.roundedRect(x, y - 1.2, 3.0, 2.4, 0.3, 0.3, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.34);
    doc.line(x + 0.3, y - 0.9, x + 1.5, y + 0.15);
    doc.line(x + 1.5, y + 0.15, x + 2.7, y - 0.9);
  } else if (kind === "globe") {
    doc.setLineWidth(0.34);
    doc.circle(x + 1.3, y, 1.3, "S");
    doc.ellipse(x + 1.3, y, 0.5, 1.3, "S");
    doc.line(x + 0.05, y, x + 2.55, y);
    doc.line(x + 0.38, y - 0.7, x + 2.22, y - 0.7);
    doc.line(x + 0.38, y + 0.7, x + 2.22, y + 0.7);
  } else if (kind === "pin") {
    doc.triangle(x + 0.1, y + 0.15, x + 2.5, y + 0.15, x + 1.3, y + 1.75, "F");
    doc.circle(x + 1.3, y - 0.35, 1.2, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(x + 1.3, y - 0.35, 0.42, "F");
  } else if (kind === "instagram") {
    doc.setFillColor(214, 41, 111); // Instagram magenta
    doc.roundedRect(x, y - 1.5, 3.0, 3.0, 0.9, 0.9, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.32);
    doc.roundedRect(x + 0.55, y - 0.95, 1.9, 1.9, 0.6, 0.6, "S");
    doc.circle(x + 1.5, y, 0.55, "S");
    doc.setFillColor(255, 255, 255);
    doc.circle(x + 2.25, y - 0.75, 0.22, "F");
  } else {
    const prevColor = doc.getTextColor();
    const prevFont = doc.getFont();
    const prevSize = doc.getFontSize();
    doc.setFillColor(10, 102, 194); // LinkedIn blue
    doc.roundedRect(x, y - 1.5, 3.0, 3.0, 0.55, 0.55, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("in", x + 1.5, y + 1.05, { align: "center" });
    doc.setTextColor(prevColor);
    doc.setFont(prevFont.fontName, prevFont.fontStyle);
    doc.setFontSize(prevSize);
  }
}

/** Stylized pine silhouette for the footer eco block (fallback when /public/tree.png is absent).
 *  x,y = top-left of the icon box, h = height (width ≈ 0.68·h). */
function drawEcoTree(doc: jsPDF, x: number, y: number, h: number) {
  const w = h * 0.68;
  const cx = x + w / 2;
  const trunkW = w * 0.22;
  const trunkH = h * 0.24;
  const canopyY = y + h * 0.76;
  doc.setFillColor(141, 101, 70);
  doc.roundedRect(cx - trunkW / 2, canopyY - 0.3, trunkW, trunkH + 0.3, 0.18, 0.18, "F");
  const layer = (yb: number, yt: number, halfW: number, rgb: [number, number, number]) => {
    doc.setFillColor(...rgb);
    doc.triangle(cx - halfW, yb, cx + halfW, yb, cx, yt, "F");
  };
  layer(canopyY, y + h * 0.38, w / 2, ECO); // bottom — green-800
  layer(y + h * 0.57, y + h * 0.18, w * 0.4, [21, 128, 61]); // mid — green-700
  layer(y + h * 0.36, y, w * 0.29, [22, 163, 74]); // top — green-600
}

function fmtMoney(n: number, currency: string): string {
  const v = round2(n);
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
  return currency === "INR" ? `Rs. ${formatted}` : `${currency} ${formatted}`;
}

/** Plain number for line-item columns (Rate / Amount / Install) — currency is shown in the totals. */
function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(round2(n));
}

function fmtDate(d?: string | Date | null): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (typeof FileReader !== "undefined") {
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return `data:${blob.type || "image/png"};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

function measureBadge(doc: jsPDF, data: string, h: number): { w: number; h: number } | null {
  try {
    const props = doc.getImageProperties(data);
    const ratio = props.width / props.height || 1;
    let bh = h;
    let bw = bh * ratio;
    if (bw > 26) {
      bw = 26;
      bh = bw / ratio;
    }
    return { w: bw, h: bh };
  } catch {
    return null;
  }
}

function drawHeader(
  doc: jsPDF,
  company: PdfCompany,
  logoData: string | null,
  isoData?: string | null,
  memberData?: string | null,
  icons: HeaderIcons = {}
): number {
  const y = MARGIN;
  const PANEL_BOTTOM = 70;

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, PAGE_W, PANEL_BOTTOM, "F");
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, PAGE_W, 3, "F");

  let logoW = 0;
  let logoH = 0;
  if (logoData) {
    try {
      const props = doc.getImageProperties(logoData);
      const ratio = props.width / props.height || 1;
      logoH = 16;
      logoW = logoH * ratio;
      if (logoW > 45) {
        logoW = 45;
        logoH = logoW / ratio;
      }
    } catch {
      logoW = 0;
      logoH = 0;
    }
  }

  type Badge = { data: string; w: number; h: number; rightX: number };
  const badges: Badge[] = [];
  let cursor = PAGE_W - MARGIN;
  for (const data of [memberData, isoData]) {
    if (!data) continue;
    const m = measureBadge(doc, data, 13);
    if (!m) continue;
    badges.push({ data, w: m.w, h: m.h, rightX: cursor });
    cursor -= m.w + 4;
  }
  const badgesLeft = cursor + 4;

  const textX = logoW ? MARGIN + logoW + 6 : MARGIN;
  const rightLimit = Math.max(textX + 40, badgesLeft - 6);
  const textEnd = drawHeaderText(doc, company, textX, Math.min(rightLimit, PAGE_W - MARGIN), icons);

  const badgeH = badges.reduce((h, b) => Math.max(h, b.h), 0);
  const blockH = Math.max(textEnd + 2 - y, logoH, badgeH);
  if (logoW && logoData) {
    doc.addImage(logoData, "PNG", MARGIN, y + (blockH - logoH) / 2, logoW, logoH);
  }
  for (const b of badges) {
    doc.addImage(b.data, "PNG", b.rightX - b.w, y + (blockH - b.h) / 2, b.w, b.h);
  }

  const ruleY = y + blockH + 4;
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, ruleY, PAGE_W - MARGIN, ruleY);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, ruleY + 0.6, PAGE_W, PANEL_BOTTOM - ruleY - 0.6, "F");
  return ruleY + 6;
}

function drawHeaderText(
  doc: jsPDF,
  company: PdfCompany,
  x: number,
  rightLimit = PAGE_W - MARGIN,
  icons: HeaderIcons = {}
): number {
  const cx = (x + rightLimit) / 2;
  const maxW = rightLimit - x;
  const ICON_W = 3.6;
  const ICON_GAP = 2.2;
  const TEXT_OFF = ICON_W + 0.6;

  doc.setTextColor(...BRAND);
  doc.setFont("helvetica", "bold");
  const name = company.companyName || "Your Company Name";
  let nameSize = 15;
  doc.setFontSize(nameSize);
  while (nameSize > 10.5 && doc.getTextWidth(name) > maxW) {
    nameSize -= 0.5;
    doc.setFontSize(nameSize);
  }
  const nameLines = (doc.splitTextToSize(name, Math.max(maxW, 30)) as string[]).slice(0, 2);
  let nameY = MARGIN + 5;
  for (const line of nameLines) {
    doc.text(line, cx, nameY, { align: "center" });
    nameY += 6;
  }

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);

  // Rows are centered individually; icons hang left of their text.
  type Contact = { icon: IconKind; text: string };
  type Part = { t: string; c: [number, number, number]; b?: boolean };
  type Row =
    | { type: "line"; icon?: IconKind; text: string; size: number; width: number }
    | { type: "inline"; contacts: Contact[]; width: number }
    | { type: "parts"; parts: Part[]; size: number; width: number };

  doc.setFontSize(8);
  const addrLines: string[] = company.address
    ? (doc.splitTextToSize(company.address, Math.max(maxW - TEXT_OFF, 30)) as string[]).slice(0, 2)
    : [];
  const addrRows: Row[] = addrLines.map((line, idx) => ({
    type: "line",
    icon: idx === 0 ? "pin" : undefined,
    text: line,
    size: 8,
    width: TEXT_OFF + doc.getTextWidth(line),
  }));

  const contacts: Contact[] = [];
  if (company.phone) contacts.push({ icon: "phone", text: company.phone });
  if (company.email) contacts.push({ icon: "mail", text: company.email });
  if (company.website) contacts.push({ icon: "globe", text: company.website });

  doc.setFontSize(7.8);
  const inlineW =
    contacts.reduce((sum, c) => sum + doc.getTextWidth(c.text), 0) +
    contacts.length * (ICON_W + ICON_GAP) +
    Math.max(contacts.length - 1, 0) * 4;
  const inline = contacts.length > 0 && inlineW <= maxW;

  const rows: Row[] = [...addrRows];
  if (inline) {
    rows.push({ type: "inline", contacts, width: inlineW });
  } else {
    for (const c of contacts) {
      rows.push({
        type: "line",
        icon: c.icon,
        text: c.text,
        size: 7.8,
        width: TEXT_OFF + doc.getTextWidth(c.text),
      });
    }
  }
  // Company IDs (GST / PAN / CIN) — labeled like the old header. One row when it
  // fits beside logo+badges, otherwise GST on its own row and PAN · CIN below it.
  const ID_LBL: [number, number, number] = [156, 163, 175]; // gray-400 — labels
  const ID_VAL: [number, number, number] = [75, 85, 99]; // gray-600 — same as body text
  const idLabel = (l: string, v: string): Part[] => [
    { t: `${l}: `, c: ID_LBL },
    { t: v, c: ID_VAL },
  ];
  const idItems: Part[][] = [];
  if (company.gstNumber) idItems.push(idLabel("GST", company.gstNumber));
  if (company.panNumber) idItems.push(idLabel("PAN", company.panNumber));
  if (company.cinNumber) idItems.push(idLabel("CIN", company.cinNumber));
  const idSep = (): Part[] => [{ t: "  ·  ", c: [156, 163, 175] }];
  const idJoin = (groups: Part[][]): Part[] =>
    groups.flatMap((g, i) => (i === 0 ? g : [...idSep(), ...g]));
  const measureParts = (parts: Part[]): number => {
    let w = TEXT_OFF;
    doc.setFontSize(7.8);
    for (const p of parts) {
      doc.setFont("helvetica", p.b ? "bold" : "normal");
      w += doc.getTextWidth(p.t);
    }
    doc.setFont("helvetica", "normal");
    return w;
  };
  const pushIdRow = (parts: Part[]) =>
    rows.push({ type: "parts", parts, size: 7.8, width: measureParts(parts) });
  if (idItems.length) {
    const all = idJoin(idItems);
    if (measureParts(all) <= maxW) pushIdRow(all);
    else if (idItems.length >= 3) {
      pushIdRow(idItems[0]);
      pushIdRow(idJoin([idItems[1], idItems[2]]));
    } else {
      for (const item of idItems) pushIdRow(item);
    }
  }

  // Every row is centered on its own (old header style); icons hang left of their text.
  let y = Math.max(MARGIN + 10, nameY - 1);
  let lastY = MARGIN + 5 + (nameLines.length - 1) * 6;
  let idGapDone = false;

  for (const row of rows) {
    if (row.type === "parts" && !idGapDone) {
      y += 1.2; // breathing room so GST/PAN/CIN read as their own group
      idGapDone = true;
    }
    if (row.type === "inline") {
      doc.setFontSize(7.8);
      let sx = Math.max(x, cx - row.width / 2);
      for (const c of row.contacts) {
        drawHeaderIcon(doc, c.icon, sx, y - 1, icons);
        doc.text(c.text, sx + TEXT_OFF, y);
        lastY = y;
        sx += ICON_W + ICON_GAP + doc.getTextWidth(c.text) + 4;
      }
      y += 4;
    } else if (row.type === "parts") {
      doc.setFontSize(row.size);
      let tx = cx - (row.width - TEXT_OFF) / 2;
      for (const p of row.parts) {
        doc.setFont("helvetica", p.b ? "bold" : "normal");
        doc.setTextColor(...p.c);
        doc.text(p.t, tx, y);
        tx += doc.getTextWidth(p.t);
      }
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      lastY = y;
      y += 3.6;
    } else {
      doc.setFontSize(row.size);
      const tw = doc.getTextWidth(row.text);
      if (row.icon) {
        const hangX = cx - tw / 2 - TEXT_OFF;
        if (hangX >= x) {
          drawHeaderIcon(doc, row.icon, hangX, y - 1, icons);
          doc.text(row.text, cx, y, { align: "center" });
        } else {
          const startX = Math.max(x, cx - (tw + TEXT_OFF) / 2);
          drawHeaderIcon(doc, row.icon, startX, y - 1, icons);
          doc.text(row.text, startX + TEXT_OFF, y);
        }
      } else {
        doc.text(row.text, cx, y, { align: "center" });
      }
      lastY = y;
      y += 3.6;
    }
  }
  return lastY;
}

function drawMeta(doc: jsPDF, quote: PdfQuotation, startY: number): number {
  let y = startY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(79, 70, 229);
  doc.text("QUOTATION", MARGIN, y + 4);

  const right = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(label, PAGE_W - MARGIN - 55, y + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(value, PAGE_W - MARGIN, y + 4, { align: "right" });
  };
  right("Quotation No:", quote.quoteNumber);
  y += 5;
  right("Date:", fmtDate(quote.quoteDate || new Date()));
  y += 5;
  right("Valid Till:", fmtDate(quote.validTill));
  if (quote.revision && quote.revision > 1) {
    y += 5;
    right("Revision:", `v${quote.revision}`);
  }

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text(quote.title, MARGIN, y);
  y += 4.5;
  if (quote.description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    const lines = doc.splitTextToSize(quote.description, CONTENT_W) as string[];
    doc.text(lines.slice(0, 3), MARGIN, y);
    y += lines.slice(0, 3).length * 4;
  }
  y += 4;

  const sales = quote.user;
  const hasSales = !!(sales && (sales.name || sales.email || sales.phone));
  const gap = 4;
  // PROJECT box was merged into CUSTOMER — 2 boxes max (or 1 without sales person).
  const boxCount = hasSales ? 2 : 1;
  const boxW = (CONTENT_W - gap * (boxCount - 1)) / boxCount;
  const innerW = boxW - 8;
  const lineH = 3.6;
  type Line = { t: string; b?: boolean };
  const wrap = (text: string, max: number, limit: number): Line[] =>
    (doc.splitTextToSize(text, max) as string[]).slice(0, limit).map((t) => ({ t }));
  const wrapBold = (text: string, max: number, limit: number): Line[] =>
    (doc.splitTextToSize(text, max) as string[]).slice(0, limit).map((t) => ({ t, b: true }));

  const leftLines: Line[] = [];
  const c = quote.customer;
  if (c) {
    leftLines.push(...wrapBold(`Name: ${c.name}`, innerW, 2));
    if (c.company) leftLines.push(...wrap(`Company: ${c.company}`, innerW, 2));
    if (c.address) leftLines.push(...wrap(`Address: ${c.address}`, innerW, 2));
    if (c.phone) leftLines.push(...wrap(`Phone: ${c.phone}`, innerW, 1));
    if (c.email) leftLines.push(...wrap(`Mail: ${c.email}`, innerW, 2));
    if (c.gstNumber) leftLines.push(...wrap(`GSTIN: ${c.gstNumber}`, innerW, 1));
  }
  // Project details live inside the customer box — they usually describe the same party.
  if (quote.projectName) leftLines.push(...wrapBold(`Project: ${quote.projectName}`, innerW, 2));
  if (quote.projectRef) leftLines.push(...wrap(`Enquiry Ref: ${quote.projectRef}`, innerW, 2));
  if (quote.contactPerson)
    leftLines.push(
      ...wrap(`Contact: ${quote.contactPerson}${quote.phone ? ` (${quote.phone})` : ""}`, innerW, 2)
    );
  if (quote.siteAddress) leftLines.push(...wrap(`Site: ${quote.siteAddress}`, innerW, 2));

  const salesLines: Line[] = [];
  if (hasSales && sales) {
    if (sales.name) salesLines.push(...wrapBold(sales.name, innerW, 2));
    if (sales.phone) salesLines.push({ t: sales.phone });
    if (sales.email) salesLines.push(...wrap(sales.email, innerW, 2));
  }

  const boxes: { label: string; lines: Line[] }[] = [{ label: "CUSTOMER", lines: leftLines }];
  if (hasSales) boxes.push({ label: "SALES PERSON", lines: salesLines });

  const need = (lines: Line[]): number =>
    lines.length ? 13.5 + (lines.length - 1) * lineH : 14;
  const boxH = Math.max(18, ...boxes.map((b) => need(b.lines)));

  boxes.forEach((b, i) => {
    const bx = MARGIN + i * (boxW + gap);
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(bx, y, boxW, boxH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(b.label, bx + 4, y + 5);

    let ly = y + 9.5;
    for (const l of b.lines) {
      doc.setFont("helvetica", l.b ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...(l.b ? ([17, 24, 39] as [number, number, number]) : GRAY));
      doc.text(l.t, bx + 4, ly);
      ly += lineH;
    }
  });

  return y + boxH + 6;
}

function drawSalutation(doc: jsPDF, quote: PdfQuotation, startY: number): number {
  let y = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39);
  doc.text("Dear Sir / Madam,", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  const paras = [
    "We sincerely thank you for referring us and for your interest in our products. We have carefully reviewed your requirements and are pleased to submit our most competitive and technically suitable offer for your kind consideration. We look forward to the opportunity to serve you and establish a mutually beneficial business relationship.",
  ];
  const gap = 2;
  for (const para of paras) {
    const lines = doc.splitTextToSize(para, CONTENT_W - 14) as string[];
    // Letter style: first line indented, rest flush left
    doc.text(lines[0], MARGIN + 10, y);
    y += 4;
    if (lines.length > 1) {
      doc.text(lines.slice(1), MARGIN + 4, y);
      y += (lines.length - 1) * 4;
    }
    y += gap;
  }
  return y - gap + 2;
}

async function drawItemsTable(
  doc: jsPDF,
  quote: PdfQuotation,
  startY: number,
  currency: string,
  includePhotos: boolean,
  itemsOverride?: PdfItem[]
): Promise<number> {
  const items = itemsOverride ?? quote.items;
  let sr = 0;
  const body: RowInput[] = [];
  const secFill: [number, number, number] = [238, 242, 255];

  // Column visibility stays consistent across all pages — computed from the full item list.
  const showDisc = quote.items.some(
    (i) => i.itemType !== "SECTION" && Number(i.discount) > 0
  );
  const showInstall = quote.items.some(
    (i) => i.itemType !== "SECTION" && Number(i.installationRate) > 0
  );
  const showPhotoCol =
    includePhotos && quote.items.some((i) => i.itemType !== "SECTION" && !!i.product?.image);

  // Total column count with all optional columns on — shrink Brand when space is tight.
  const totalColsWithAll = 8 + (showDisc ? 1 : 0) + (showInstall ? 1 : 0) + (showPhotoCol ? 1 : 0);
  const brandWidth = (totalColsWithAll >= 10 ? 20 : 24) - (showInstall ? 2 : 0);
  const descWidth = showPhotoCol ? (showDisc ? 34 : 45) : showDisc ? 50 : 61;
  const photoWidth = showInstall ? 14 : 16;
  const rateWidth = showInstall ? 22 : 24;
  const amountWidth = showInstall ? 24 : 26;
  const installWidth = 20;

  const photoByRowIndex = new Map<number, string>();
  const photoUrlMap = new Map<string, string>();
  if (showPhotoCol) {
    const urls = new Set<string>();
    for (const item of items) {
      if (item.itemType !== "SECTION" && item.product?.image) urls.add(item.product.image);
    }
    const loaded = await Promise.all(
      Array.from(urls).map(async (u) => ({ u, data: await loadPhotoDataUrl(u, 320, 0.8) }))
    );
    for (const { u, data } of loaded) if (data) photoUrlMap.set(u, data);
  }

  items.forEach((item) => {
    const rowIndex = body.length;
    if (item.itemType === "SECTION") {
      const secStyle = { fillColor: secFill, fontSize: 9.5, minCellHeight: 6.5 };
      body.push([
        { content: "", styles: secStyle },
        ...(showPhotoCol ? [{ content: "", styles: secStyle }] : []),
        {
          content: cleanSectionTitle(item.description) || item.description,
          styles: { ...secStyle, fontStyle: "bold", textColor: [55, 48, 163] },
        },
        ...Array.from({ length: (showDisc ? 7 : 6) + (showInstall ? 1 : 0) }, () => ({ content: "", styles: secStyle })),
      ]);
      return;
    }
    sr += 1;
    const base = item.quantity * item.rate * (1 - (item.discount || 0) / 100);
    const amount = round2(base);
    const descParts = [item.description];
    if (item.specifications) descParts.push(item.specifications);
    const row: RowInput = [String(sr)];
    if (showPhotoCol) {
      const url = item.product?.image ? photoUrlMap.get(item.product.image) : undefined;
      if (url) photoByRowIndex.set(rowIndex, url);
      row.push({
        content: "",
        styles: { minCellHeight: 14, halign: "center", valign: "middle" },
      });
    }
    row.push(
      {
        content: descParts.join("\n") + (item.isOptional ? "\n[OPTIONAL]" : ""),
        styles: item.isOptional ? { textColor: [146, 64, 14] } : {},
      },
      [item.brand, item.modelNumber].filter(Boolean).join("\n") || "—",
      item.hsnCode || "—",
      item.unit || "nos",
      String(item.quantity),
      fmtNum(item.rate)
    );
    if (showDisc) row.push(item.discount ? `${item.discount}%` : "—");
    row.push(fmtNum(amount));
    if (showInstall) row.push(item.installationRate ? fmtNum(item.installationRate) : "—");
    body.push(row);
  });

  const head: string[][] = [
    [
      "Sr.",
      ...(showPhotoCol ? ["Photo"] : []),
      "Description",
      "Brand / Model",
      "HSN",
      "Unit",
      "Qty",
      "Rate",
      ...(showDisc ? ["Disc"] : []),
      "Amount",
      ...(showInstall ? ["Unit\nInstallation"] : []),
    ],
  ];

  const widths: number[] = [9];
  if (showPhotoCol) widths.push(photoWidth);
  widths.push(descWidth, brandWidth, 14, 12, 12, rateWidth);
  if (showDisc) widths.push(11);
  widths.push(amountWidth);
  if (showInstall) widths.push(installWidth);
  const scale = CONTENT_W / widths.reduce((a, b) => a + b, 0);

  const columnStyles: Record<number, Partial<Styles>> = {};
  let ci = 0;
  const put = (extra: Partial<Styles> = {}) => {
    columnStyles[ci] = { cellWidth: widths[ci] * scale, ...extra };
    ci += 1;
  };
  put({ halign: "center" });
  if (showPhotoCol) put({ halign: "center" });
  put();
  put();
  put({ halign: "center" });
  put({ halign: "center" });
  put({ halign: "right" });
  put({ halign: "right" });
  if (showDisc) put({ halign: "right" });
  put({ halign: "right", fontStyle: "bold" });
  if (showInstall) put({ halign: "right" });

  const totalCols = head[0].length;
  const emptyRow = ["—", "No items", ...Array.from({ length: totalCols - 2 }, () => "")];

  autoTable(doc, {
    startY,
    margin: { left: MARGIN, right: MARGIN },
    head,
    body: body.length ? body : [emptyRow],
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 1.6,
      textColor: [31, 41, 55],
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles,
    didParseCell: (data) => {
      if (data.section === "head") data.cell.styles.halign = "center";
    },
    didDrawCell: (data) => {
      if (!showPhotoCol || data.section !== "body" || data.column.index !== 1) return;
      const url = photoByRowIndex.get(data.row.index);
      if (!url) return;
      try {
        const props = doc.getImageProperties(url);
        const aspect = props.width / props.height;
        const maxW = data.cell.width - 3;
        const maxH = data.cell.height - 3;
        let w = maxW;
        let h = w / aspect;
        if (h > maxH) {
          h = maxH;
          w = h * aspect;
        }
        doc.addImage(
          url,
          url.startsWith("data:image/png") ? "PNG" : "JPEG",
          data.cell.x + (data.cell.width - w) / 2,
          data.cell.y + (data.cell.height - h) / 2,
          w,
          h
        );
      } catch {
        // skip broken images
      }
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  return finalY + 6;
}

/** Section-wise summary table — each solution/section with its price. */
function drawSectionSummaryTable(
  doc: jsPDF,
  quote: PdfQuotation,
  startY: number,
  currency: string
): number {
  const groups = groupItemsBySection(quote.items);
  if (groups.length < 2) return startY;

  const stats = groups.map((g) => sectionTotalsOf(g.items));
  const showInstall = stats.some((st) => st.installation > 0 || st.gstOnInstallation > 0);

  const body: RowInput[] = groups.map((g, i) => {
    const st = stats[i];
    const row: RowInput = [
      String(i + 1),
      g.title,
      String(st.itemCount),
      fmtMoney(st.subtotal, currency),
      fmtMoney(st.gst, currency),
    ];
    if (showInstall)
      row.push(fmtMoney(round2(st.installation + st.gstOnInstallation), currency));
    row.push(fmtMoney(st.total, currency));
    return row;
  });

  const head: string[][] = [
    [
      "#",
      "Solution / Section",
      "Items",
      "Subtotal",
      "GST",
      ...(showInstall ? ["Installation\n(incl. GST)"] : []),
      "Total (incl. GST)",
    ],
  ];

  // Column widths: name flexes, numeric columns fixed
  const totalIdx = showInstall ? 6 : 5;
  const fixedW = 10 + 14 + 28 + 24 + (showInstall ? 30 : 0) + 32;
  const columnStyles: Record<number, Partial<Styles>> = {
    0: { cellWidth: 10, halign: "center" },
    1: { cellWidth: CONTENT_W - fixedW },
    2: { cellWidth: 14, halign: "center" },
    3: { cellWidth: 28, halign: "right" },
    4: { cellWidth: 24, halign: "right" },
  };
  if (showInstall) columnStyles[5] = { cellWidth: 30, halign: "right" };
  columnStyles[totalIdx] = { cellWidth: 32, halign: "right", fontStyle: "bold" };

  autoTable(doc, {
    startY,
    margin: { left: MARGIN, right: MARGIN },
    head,
    body,
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 1.8,
      textColor: [31, 41, 55],
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles,
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  return finalY + 8;
}

function summaryParts(doc: jsPDF, quote: PdfQuotation, taxType: GstTaxType) {
  const totals = calcQuotationTotals({
    items: quote.items,
    discountType: quote.discountType,
    discountValue: quote.discountValue,
    additionalCharges: quote.additionalCharges,
    shippingCharges: quote.shippingCharges,
    installationCharge: quote.installationCharge,
  });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  const words = amountInWords(totals.grandTotalRounded, "INR");
  const wordLines = doc.splitTextToSize(words, SUMMARY_W - 6) as string[];

  const split = taxType === "intra" ? 2 : 1;
  let rows = 1; // subtotal
  if (totals.discountAmount > 0) rows += 1;
  if (totals.installationCharge > 0) rows += 1;
  rows += totals.gstBreakup.length * split;
  if (totals.gstOnServices > 0) rows += split;
  if (quote.additionalCharges) rows += 1;
  if (quote.shippingCharges) rows += 1;
  if (totals.roundOff !== 0) rows += 1;

  const boxH = 3 + 7 + rows * 5.2 + 7 + 4.5 + (wordLines.length - 1) * 3.6 + 4;
  return { totals, wordLines, rows, boxH };
}

const fmtRate = (r: number) => (Number.isInteger(r) ? String(r) : String(round2(r)));

function gstRowLabels(rate: number, taxType: GstTaxType): [string, string] | [string] {
  if (taxType === "intra") {
    const half = fmtRate(rate / 2);
    return [`CGST @ ${half}%`, `SGST @ ${half}%`];
  }
  if (taxType === "inter") return [`IGST @ ${rate}%`];
  return [`GST @ ${rate}%`];
}

function drawSummary(doc: jsPDF, quote: PdfQuotation, startY: number, currency: string, taxType: GstTaxType): number {
  const { totals, wordLines, boxH } = summaryParts(doc, quote, taxType);
  const x = PAGE_W - MARGIN - SUMMARY_W;
  const y = startY;

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(x, y, SUMMARY_W, boxH, 2, 2, "FD");

  let cursor = y + 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text("COMMERCIAL SUMMARY", x + 3, cursor + 4);
  cursor += 7;

  const row = (label: string, value: string, bold = false, color: [number, number, number] = [31, 41, 55]) => {
    cursor += 5.2;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 8.5 : 7.5);
    doc.setTextColor(17, 24, 39);
    doc.text(label, x + 3, cursor);
    doc.setTextColor(...color);
    doc.text(value, x + SUMMARY_W - 3, cursor, { align: "right" });
  };

  row("Subtotal", fmtMoney(totals.subtotal, currency));
  if (totals.discountAmount > 0) {
    const label = quote.discountType === "percentage" ? `Discount (${quote.discountValue}%)` : "Discount";
    row(label, `-${fmtMoney(totals.discountAmount, currency)}`, false, [220, 38, 38]);
  }
  if (totals.installationCharge > 0) {
    row("Installation & Integration", fmtMoney(totals.installationCharge, currency));
  }
  totals.gstBreakup.forEach((slab) => {
    const labels = gstRowLabels(slab.rate, taxType);
    if (labels.length === 2) {
      const cgst = round2(slab.gstAmount / 2);
      row(labels[0], fmtMoney(cgst, currency));
      row(labels[1], fmtMoney(round2(slab.gstAmount - cgst), currency));
    } else {
      row(labels[0], fmtMoney(slab.gstAmount, currency));
    }
  });
  if (totals.gstOnServices > 0) {
    const labels = gstRowLabels(totals.servicesGstRate, taxType).map((l) => l.replace(" @", " on Services @"));
    if (labels.length === 2) {
      const cgst = round2(totals.gstOnServices / 2);
      row(labels[0], fmtMoney(cgst, currency));
      row(labels[1], fmtMoney(round2(totals.gstOnServices - cgst), currency));
    } else {
      row(labels[0], fmtMoney(totals.gstOnServices, currency));
    }
  }
  if (quote.additionalCharges) row("Additional Charges", fmtMoney(quote.additionalCharges, currency));
  if (quote.shippingCharges) row("Shipping / Delivery", fmtMoney(quote.shippingCharges, currency));
  if (totals.roundOff !== 0) {
    row(
      "Round Off",
      (totals.roundOff > 0 ? "+" : "") + fmtMoney(totals.roundOff, currency),
      false,
      totals.roundOff > 0 ? [31, 41, 55] : [220, 38, 38]
    );
  }

  cursor += 7;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(x + 3, cursor - 4.5, x + SUMMARY_W - 3, cursor - 4.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text("GRAND TOTAL", x + 3, cursor);
  doc.text(fmtMoney(totals.grandTotalRounded, currency), x + SUMMARY_W - 3, cursor, { align: "right" });

  cursor += 4.5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  wordLines.forEach((line, i) => {
    doc.text(line, x + 3, cursor + i * 3.6);
  });

  return y + boxH;
}

function drawTextSection(
  doc: jsPDF,
  title: string,
  content: string,
  startY: number,
  width = CONTENT_W
): number {
  if (!content?.trim()) return startY;
  let y = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(title, MARGIN, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  const lines = doc.splitTextToSize(content, width) as string[];
  for (const line of lines) {
    if (y > 275) {
      doc.addPage();
      y = MARGIN + 6;
    }
    doc.text(line, MARGIN, y);
    y += 3.6;
  }
  return y + 3;
}

async function drawBankBox(doc: jsPDF, company: PdfCompany, startY: number, width = LEFT_COL_W): Promise<number> {
  const hasBank = Boolean(
    company.bankName || company.bankAccountName || company.bankAccountNumber || company.bankIfsc || company.bankBranch || company.bankUpiId
  );
  if (!hasBank) return startY;

  let qrDataUrl: string | null = null;
  if (company.bankQrPath) {
    try {
      qrDataUrl = await fetchAsDataUrl(company.bankQrPath);
    } catch {
      qrDataUrl = null;
    }
  }
  if (!qrDataUrl && company.bankUpiId) {
    try {
      qrDataUrl = await QRCode.toDataURL(`upi://pay?pa=${company.bankUpiId}&pn=${encodeURIComponent(company.companyName || "")}`, {
        margin: 0,
        width: 256,
        errorCorrectionLevel: "M",
      });
    } catch {
      qrDataUrl = null;
    }
  }

  const qrSize = qrDataUrl ? 22 : 0;
  const qrGap = qrDataUrl ? 4 : 0;
  const pad = 3.5;
  const innerX = MARGIN + pad;
  const innerW = width - pad * 2 - (qrDataUrl ? qrSize + qrGap : 0);
  const colW = (innerW - 3) / 2;
  const rowH = 7;

  type Field = { label: string; value: string; bold?: boolean; full?: boolean };
  const rows: { left?: Field; right?: Field; full?: Field }[] = [];
  if (company.bankAccountName) {
    rows.push({ full: { label: "A/C Name", value: company.bankAccountName, bold: true } });
  }
  if (company.bankAccountNumber || company.bankIfsc) {
    rows.push({
      left: company.bankAccountNumber ? { label: "A/C No.", value: company.bankAccountNumber } : undefined,
      right: company.bankIfsc ? { label: "IFSC", value: company.bankIfsc } : undefined,
    });
  }
  if (company.bankBranch) {
    rows.push({ left: { label: "Branch", value: company.bankBranch } });
  }
  if (company.bankUpiId) {
    rows.push({ left: { label: "UPI ID", value: company.bankUpiId } });
  }

  const textH = 12 + rows.length * rowH + pad;
  const boxH = Math.max(textH, qrDataUrl ? qrSize + 10 : 0);
  if (startY + boxH > PAGE_BOTTOM) {
    doc.addPage();
    startY = MARGIN + 6;
  }

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(MARGIN, startY, width, boxH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text("BANK DETAILS", innerX, startY + 5);
  if (company.bankName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(company.bankName, innerX, startY + 9.5);
  }

  let ly = startY + 15;
  for (const row of rows) {
    const drawField = (x: number, w: number, f: Field) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(156, 163, 175);
      doc.text(f.label, x, ly);
      doc.setFont("helvetica", f.bold ? "bold" : "normal");
      doc.setFontSize(8);
      doc.setTextColor(17, 24, 39);
      const v = doc.splitTextToSize(f.value, w) as string[];
      doc.text(v[0], x, ly + 3.4);
    };
    if (row.full) drawField(innerX, innerW, row.full);
    if (row.left) drawField(innerX, colW, row.left);
    if (row.right) drawField(innerX + colW + 3, colW, row.right);
    ly += rowH;
  }

  if (qrDataUrl) {
    const qx = MARGIN + width - pad - qrSize;
    const qy = startY + (boxH - qrSize) / 2;
    doc.addImage(qrDataUrl, "PNG", qx, qy, qrSize, qrSize);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(156, 163, 175);
    doc.text("Scan to Pay", qx + qrSize / 2, qy + qrSize + 3, { align: "center" });
  }

  return startY + boxH + 3;
}

function drawSignatures(
  doc: jsPDF,
  quote: PdfQuotation,
  startY: number,
  companyName: string
): number {
  let y = startY + 10;
  if (y > 248) {
    doc.addPage();
    y = MARGIN + 10;
  }

  const rightX = PAGE_W - MARGIN - 70;
  const signatory = quote.authorizedSignatory || quote.preparedBy;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(rightX, y + 14, PAGE_W - MARGIN, y + 14);

  // Everything in the signature block is left-aligned to the line's start (rightX).
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text("Yours faithfully,", rightX, y + 5);

  if (signatory) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(signatory, rightX, y + 12);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text(`For ${companyName || "the Company"}`, rightX, y + 18);

  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text("Authorized Signatory", rightX, y + 22);

  return y + 28;
}

/** Standard company header (same as page 1, with ISO/member logos) + section title band. */
function drawSectionPageHeader(
  doc: jsPDF,
  company: PdfCompany,
  quote: PdfQuotation,
  logoData: string | null,
  isoData: string | null,
  memberData: string | null,
  sectionNo: number,
  sectionCount: number,
  sectionTitle: string,
  icons: HeaderIcons = {}
): number {
  const y = drawHeader(doc, company, logoData, isoData, memberData, icons);

  // Section title band
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(MARGIN, y, CONTENT_W, 10, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(55, 48, 163);
  doc.text(`${sectionNo}. ${sectionTitle}`, MARGIN + 3.5, y + 6.6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(99, 102, 241);
  doc.text(`Section ${sectionNo} of ${sectionCount}`, PAGE_W - MARGIN - 3.5, y + 6.6, {
    align: "right",
  });

  return y + 16;
}

/** Section total block — pinned at the bottom of a section page. */
function drawSectionTotal(
  doc: jsPDF,
  items: PdfItem[],
  tableBottom: number,
  currency: string,
  servicesGstRate: number
): number {
  const st = sectionTotalsOf(items);
  const w = 84;
  const x = PAGE_W - MARGIN - w;

  let y = tableBottom + 5;
  if (y + 40 > PAGE_BOTTOM) {
    doc.addPage();
    y = MARGIN + 8;
  }

  const rates = new Set(
    items.filter((i) => i.itemType !== "SECTION").map((i) => i.gstRate)
  );
  const gstLabel =
    st.gst > 0 && rates.size === 1 ? `GST @ ${fmtRate([...rates][0])}%` : "GST";

  const rows = [
    ["Subtotal", fmtMoney(st.subtotal, currency)],
    [gstLabel, fmtMoney(st.gst, currency)],
  ];
  if (st.installation > 0) rows.push(["Installation", fmtMoney(st.installation, currency)]);
  if (st.gstOnInstallation > 0)
    rows.push([`GST on Installation @ ${servicesGstRate}%`, fmtMoney(st.gstOnInstallation, currency)]);

  const boxH = 10 + rows.length * 5.2 + 11;
  if (y + boxH > PAGE_BOTTOM) {
    doc.addPage();
    y = MARGIN + 8;
  }

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(x, y, w, boxH, 2, 2, "FD");

  let cursor = y + 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text("SECTION TOTAL", x + 3, cursor + 4);
  cursor += 7;

  for (const [label, value] of rows) {
    cursor += 5.2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(label, x + 3, cursor);
    doc.setTextColor(31, 41, 55);
    doc.text(value, x + w - 3, cursor, { align: "right" });
  }

  cursor += 6;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(x + 3, cursor - 4, x + w - 3, cursor - 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text("Total (incl. GST)", x + 3, cursor);
  doc.setTextColor(55, 48, 163);
  doc.text(fmtMoney(st.total, currency), x + w - 3, cursor, { align: "right" });

  return y + boxH;
}

export async function generateQuotationPdf(
  quote: PdfQuotation,
  company: PdfCompany,
  options: PdfOptions = {}
): Promise<void> {
  const currency = options.currency || "INR";
  const taxType = gstTaxType(company.gstNumber, quote.customer?.gstNumber);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({
    title: quote.quoteNumber,
    author: company.companyName || "Quotation System",
    creator: company.companyName || "Quotation System",
  });

  let logoData: string | null = null;
  if (company.logoPath) {
    logoData = company.logoPath.startsWith("data:")
      ? company.logoPath
      : await fetchAsDataUrl(company.logoPath);
  }
  const loadBadge = async (p?: string | null) =>
    !p ? null : p.startsWith("data:") ? p : await fetchAsDataUrl(p);
  const isoData = await loadBadge(company.isoLogoPath);
  const memberData = await loadBadge(company.memberLogoPath);

  // Optional assets from /public — vector/text fallbacks when the files are absent.
  const iconPaths: Record<HeaderIconKind, string> = {
    phone: "/icons/phone.png",
    mail: "/icons/mail.png",
    globe: "/icons/globe.png",
    instagram: "/icons/instagram.png",
    linkedin: "/icons/linkedin.png",
  };
  const iconEntries = await Promise.all(
    (Object.keys(iconPaths) as HeaderIconKind[]).map(async (k) => [k, await fetchAsDataUrl(iconPaths[k])] as const)
  );
  const icons: HeaderIcons = {};
  for (const [k, data] of iconEntries) if (data) icons[k] = data;
  const treeData = (await fetchAsDataUrl("/tree.png")) || (await fetchAsDataUrl("/tree.jpg"));

  let y = drawHeader(doc, company, logoData, isoData, memberData, icons);
  y = drawMeta(doc, quote, y);
  y = drawSalutation(doc, quote, y);

  const sectionGroups = groupItemsBySection(quote.items);
  const splitPages = options.sections !== false && sectionGroups.length >= 2;

  if (splitPages) {
    // PAGE 1 — Section-wise summary comes first
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(55, 48, 163);
    doc.text("Summary", MARGIN, y);
    y += 3;
    y = drawSectionSummaryTable(doc, quote, y, currency);
  } else {
    y = await drawItemsTable(doc, quote, y, currency, options.includePhotos === true);
  }

  const measured = summaryParts(doc, quote, taxType);
  if (y + measured.boxH > PAGE_BOTTOM) {
    doc.addPage();
    y = MARGIN + 8;
  }

  const summaryBottom = drawSummary(doc, quote, y, currency, taxType);

  const pageBefore = doc.getCurrentPageInfo().pageNumber;
  let leftY = y;
  const deliveryScope = [quote.deliveryTimeline, quote.installationScope]
    .filter(Boolean)
    .join("\n");
  leftY = drawTextSection(doc, "Payment Terms", quote.paymentTerms || "", leftY, LEFT_COL_W);
  leftY = drawTextSection(doc, "Delivery & Installation", deliveryScope, leftY, LEFT_COL_W);
  leftY = drawTextSection(doc, "Warranty", quote.warranty || "", leftY, LEFT_COL_W);
  leftY = drawTextSection(doc, "Scope & Clarifications", quote.technicalNotes || "", leftY, LEFT_COL_W);
  leftY = drawTextSection(doc, "Exclusions", quote.exclusions || "", leftY, LEFT_COL_W);
  leftY = drawTextSection(doc, "Assumptions", quote.assumptions || "", leftY, LEFT_COL_W);
  leftY = drawTextSection(doc, "Notes", quote.notes || "", leftY, LEFT_COL_W);
  leftY = drawTextSection(doc, "Terms & Conditions", quote.terms || "", leftY, LEFT_COL_W);

  const bankTop = leftY;
  if (options.includeBank !== false) {
    leftY = await drawBankBox(doc, company, leftY, LEFT_COL_W);
  }
  const pageAfter = doc.getCurrentPageInfo().pageNumber;

  if (pageAfter > pageBefore) {
    y = drawSignatures(doc, quote, leftY, company.companyName || "");
  } else {
    // Bank box is left-column; signature is right-aligned — they don't overlap
    // horizontally, so the signature can sit below the summary, beside the bank box.
    const sigTop = Math.max(summaryBottom, bankTop) - 10;
    y = drawSignatures(doc, quote, sigTop, company.companyName || "");
    y = Math.max(y, leftY);
  }

  // PAGES 2..N — one page per section, each with its own total at the bottom
  if (splitPages) {
    for (let i = 0; i < sectionGroups.length; i++) {
      const g = sectionGroups[i];
      doc.addPage();
      const sy = drawSectionPageHeader(
        doc,
        company,
        quote,
        logoData,
        isoData,
        memberData,
        i + 1,
        sectionGroups.length,
        g.title || `Section ${i + 1}`,
        icons
      );
      const tableBottom = await drawItemsTable(
        doc,
        quote,
        sy,
        currency,
        options.includePhotos === true,
        g.items
      );
      drawSectionTotal(doc, g.items, tableBottom, currency, DEFAULT_SERVICES_GST_RATE);
    }
  }

  if (options.includeCertificates && options.certificates?.length) {
    for (const cert of options.certificates) {
      const data = cert.url.startsWith("data:") ? cert.url : await fetchAsDataUrl(cert.url);
      if (!data) continue;
      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text(`Appendix — ${cert.name}`, MARGIN, MARGIN + 6);
      try {
        const props = doc.getImageProperties(data);
        const maxW = CONTENT_W;
        const maxH = 220;
        let w = maxW;
        let h = (w * props.height) / props.width;
        if (h > maxH) {
          h = maxH;
          w = (h * props.width) / props.height;
        }
        doc.addImage(data, "PNG", (PAGE_W - w) / 2, MARGIN + 14, w, h);
      } catch {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Certificate could not be embedded.", MARGIN, MARGIN + 20);
      }
    }
  }

  const total = doc.getNumberOfPages();

  const stripUrl = (u: string) => u.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const toUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${stripUrl(u)}`);
  // Website is icon-only (still links out); Instagram/LinkedIn always shown.
  const socials: { kind: IconKind; label: string; url: string | null }[] = [];
  if (company.website) socials.push({ kind: "globe", label: "", url: toUrl(company.website) });
  socials.push({
    kind: "instagram",
    label: "",
    url: company.instagramUrl ? toUrl(company.instagramUrl) : null,
  });
  socials.push({
    kind: "linkedin",
    label: "",
    url: company.linkedinUrl ? toUrl(company.linkedinUrl) : null,
  });

  // Center of the footer row: tree + "Save Paper Save Tree" + tree (mirrored, text dead-center).
  const ecoText = "Save Paper Save Tree";
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  const ecoTextW = doc.getTextWidth(ecoText);
  const ecoIconH = 6.4;
  let treeImgW = 0;
  let treeImgH = 0;
  if (treeData) {
    try {
      const props = doc.getImageProperties(treeData);
      const ratio = props.width / props.height || 1;
      treeImgH = ecoIconH;
      treeImgW = treeImgH * ratio;
      if (treeImgW > 9) {
        treeImgW = 9;
        treeImgH = treeImgW / ratio;
      }
    } catch {
      treeImgW = 0;
      treeImgH = 0;
    }
  }
  const treeIconW = treeImgW || ecoIconH * 0.68;
  const ecoBlockW = treeIconW + 1.5 + ecoTextW + 1.5 + treeIconW;
  const ecoBlockX = (PAGE_W - ecoBlockW) / 2;

  const bandY = 282;
  // Chips + eco block sit vertically centered in the footer band (GST/phone line removed).
  const chipY = 286.2;
  const linkY = 290.5;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, PAGE_W, 13.5, "F");
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, PAGE_W, 3, "F");

    doc.setFillColor(248, 250, 252);
    doc.rect(0, bandY, PAGE_W, 297 - bandY, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(0, bandY, PAGE_W, bandY);

    if (i > 1) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(156, 163, 175);
      doc.text(`QUOTATION · ${quote.quoteNumber}`, PAGE_W - MARGIN, MARGIN - 4, {
        align: "right",
      });
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    let sx = MARGIN;
    for (const s of socials) {
      const tw = s.label ? doc.getTextWidth(s.label) : 0;
      const chipW = s.label ? 9 + tw : 7.5;
      if (sx + chipW > ecoBlockX - 5) break;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(sx, chipY, chipW, 6.6, 1.6, 1.6, "FD");
      drawHeaderIcon(doc, s.kind, sx + 2.2, chipY + 3.4, icons);
      if (s.label) doc.text(s.label, sx + 6.4, linkY);
      if (s.url) doc.link(sx, chipY, chipW, 6.6, { url: s.url });
      sx += chipW + 5;
    }

    const ecoY = chipY + (6.6 - ecoIconH) / 2;
    const drawTree = (tx: number) => {
      if (treeData && treeImgW) {
        try {
          doc.addImage(treeData, imgFormat(treeData), tx, chipY + (6.6 - treeImgH) / 2, treeImgW, treeImgH);
          return;
        } catch {
          // unreadable tree image — fall through to vector
        }
      }
      drawEcoTree(doc, tx, ecoY, ecoIconH);
    };
    drawTree(ecoBlockX);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(...ECO);
    doc.text(ecoText, ecoBlockX + treeIconW + 1.5, linkY);
    drawTree(ecoBlockX + treeIconW + 1.5 + ecoTextW + 1.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(`Page ${i} of ${total}`, PAGE_W - MARGIN, linkY, { align: "right" });
  }

  doc.save(`${quote.quoteNumber}.pdf`);
}
