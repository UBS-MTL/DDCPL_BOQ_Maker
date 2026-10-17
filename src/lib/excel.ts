import ExcelJS from "exceljs";
import {
  calcQuotationTotals,
  round2,
  gstTaxType,
  groupItemsBySection,
  sectionTotalsOf,
  cleanSectionTitle,
  type GstTaxType,
} from "@/lib/calc";
import { loadPhotoDataUrl } from "@/lib/images";

// exceljs's CellValue formula variant technically requires `sharedFormula`,
// but `{ formula, result }` works at runtime — cast once here instead of at each cell.
function fx(formula: string): ExcelJS.CellValue {
  return { formula, result: 0 } as unknown as ExcelJS.CellValue;
}

export type ExcelItem = {
  itemType?: string;
  description: string;
  brand?: string | null;
  modelNumber?: string | null;
  specifications?: string | null;
  hsnCode?: string | null;
  unit: string;
  quantity: number;
  rate: number;
  discount: number;
  gstRate: number;
  installationRate?: number;
  isOptional?: boolean;
  product?: { image?: string | null } | null;
};

export type ExcelQuotation = {
  quoteNumber: string;
  title: string;
  description?: string | null;
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
  status?: string;
  customer?: {
    name: string;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    gstNumber?: string | null;
  } | null;
  user?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  items: ExcelItem[];
};

export type ExcelCompany = {
  companyName?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  website?: string;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankBranch?: string | null;
  logoPath?: string | null;
  signaturePath?: string | null;
};

const HEADER_FILL = "FF4F46E5";
const LIGHT_FILL = "FFF9FAFB";
const BORDER_COLOR = "FFE5E7EB";
const currencyFmt = '"₹" #,##0.00';
/** Plain number for BOQ line columns — currency appears in the summary/totals instead. */
const numFmt = "#,##0.00";

function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: "thin", color: { argb: BORDER_COLOR } },
    left: { style: "thin", color: { argb: BORDER_COLOR } },
    bottom: { style: "thin", color: { argb: BORDER_COLOR } },
    right: { style: "thin", color: { argb: BORDER_COLOR } },
  };
}

function fmtDate(d?: string | Date | null): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export async function generateQuotationExcel(
  quote: ExcelQuotation,
  company: ExcelCompany,
  options: { includePhotos?: boolean; sections?: boolean } = {}
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = company.companyName || "Quotation System";
  wb.created = new Date();
  wb.calcProperties = { fullCalcOnLoad: true };

  const totals = calcQuotationTotals({
    items: quote.items,
    discountType: quote.discountType,
    discountValue: quote.discountValue,
    additionalCharges: quote.additionalCharges,
    shippingCharges: quote.shippingCharges,
    installationCharge: quote.installationCharge,
  });
  const itemInstallTotal = quote.items
    .filter((i) => i.itemType !== "SECTION" && !i.isOptional)
    .reduce((sum, i) => sum + (i.quantity * (i.installationRate || 0)), 0);
  const showInstallCol = itemInstallTotal > 0;

  const summary = wb.addWorksheet("Quotation Summary", {
    properties: { defaultRowHeight: 20 },
    pageSetup: { paperSize: 9, orientation: "portrait", margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } },
  });
  summary.columns = [{ width: 30 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 20 }, { width: 18 }];
  summary.mergeCells("A1:F1");
  const titleCell = summary.getCell("A1");
  titleCell.value = company.companyName || "Quotation";
  titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  summary.getRow(1).height = 30;

  const kvRows: [string, string | number][] = [
    ["Company Address", company.address || ""],
    ["Phone", company.phone || ""],
    ["Email", company.email || ""],
    ["GSTIN", company.gstNumber || ""],
    ["", ""],
    ["Quotation No", quote.quoteNumber],
    ["Quotation Date", fmtDate(quote.quoteDate || new Date())],
    ["Valid Till", fmtDate(quote.validTill)],
    ["Revision", quote.revision || 1],
    ["Status", quote.status || "draft"],
    ["Prepared By", quote.preparedBy || quote.user?.name || ""],
    ["Sales Person", quote.user?.name || ""],
    ["Sales Person Phone", quote.user?.phone || ""],
    ["Sales Person Email", quote.user?.email || ""],
    ["", ""],
    ["Customer", quote.customer?.name || ""],
    ["Company", quote.customer?.company || ""],
    ["Customer Email", quote.customer?.email || ""],
    ["Customer Phone", quote.customer?.phone || ""],
    ["Billing Address", quote.customer?.address || ""],
    ["Customer GSTIN", quote.customer?.gstNumber || ""],
    ["", ""],
    ["Project", quote.projectName || ""],
    ["Project Ref", quote.projectRef || ""],
    ["Site Address", quote.siteAddress || ""],
    ["Contact Person", quote.contactPerson || ""],
    ["Contact Phone", quote.phone || ""],
    ["Contact Email", quote.email || ""],
  ];

  let r = 3;
  for (const [k, v] of kvRows) {
    if (!k && !v) {
      r += 1;
      continue;
    }
    const kc = summary.getCell(`A${r}`);
    const vc = summary.getCell(`B${r}`);
    kc.value = k;
    vc.value = v;
    kc.font = { bold: true, size: 10, color: { argb: "FF374151" } };
    vc.font = { size: 10, color: { argb: "FF111827" } };
    kc.border = thinBorder();
    vc.border = thinBorder();
    kc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_FILL } };
    r += 1;
  }

  r += 1;
  summary.mergeCells(`A${r}:F${r}`);
  const commHead = summary.getCell(`A${r}`);
  commHead.value = "Commercial Summary";
  commHead.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  commHead.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  r += 1;

  const showPhotoCol =
    options.includePhotos === true &&
    quote.items.some((i) => i.itemType !== "SECTION" && !!i.product?.image);
  // Combined mode = flat item list, no section header/total rows or section summary.
  const sectionsMode = options.sections !== false;
  const sectionRowCount = quote.items.filter((i) => i.itemType === "SECTION").length;
  // BOQ totals row = header + item rows + one "Section Total" row per non-empty section.
  const sectionTotalRows = sectionsMode ? groupItemsBySection(quote.items).filter((g) => g.items.length > 0).length : 0;
  // Combined mode skips SECTION rows entirely — don't count them toward row indexes.
  const totalsRow = 2 + quote.items.length - (sectionsMode ? 0 : sectionRowCount) + sectionTotalRows;
  const baseCol = showPhotoCol ? "K" : "J";
  const gstCol = showPhotoCol ? "M" : "L";
  const amtCol = showPhotoCol ? "N" : "M";
  const n = (v: number) => String(round2(v));
  const taxType: GstTaxType = gstTaxType(company.gstNumber, quote.customer?.gstNumber);
  const fmtRate = (rate: number) => (Number.isInteger(rate) ? String(rate) : String(round2(rate)));

  const commRows: [string, string | number, boolean?][] = [
    ["Subtotal", `='BOQ Details'!${baseCol}${totalsRow}`],
  ];
  if (totals.discountAmount > 0) {
    commRows.push([
      "Discount",
      quote.discountType === "fixed" ? -quote.discountValue : -totals.discountAmount,
    ]);
  }
  if (totals.installationCharge > 0) {
    commRows.push(["Installation & Integration", totals.installationCharge]);
  }
  const gstRowsFor = (amount: number, rate: number, onServices: boolean, slabIndex: number) => {
    const suffix = onServices ? " on Services" : "";
    if (taxType === "intra") {
      const half = fmtRate(rate / 2);
      const cgst = round2(amount / 2);
      commRows.push([`CGST${suffix} @ ${half}%`, cgst]);
      commRows.push([`SGST${suffix} @ ${half}%`, round2(amount - cgst)]);
    } else if (taxType === "inter") {
      commRows.push([`IGST${suffix} @ ${rate}%`, amount]);
    } else if (onServices) {
      commRows.push([`GST on Services @ ${rate}%`, amount]);
    } else if (totals.gstBreakup.length === 1) {
      commRows.push([`GST @ ${rate}%`, `='BOQ Details'!${gstCol}${totalsRow}`]);
    } else if (slabIndex === 0) {
      commRows.push(["GST (Supply)", `='BOQ Details'!${gstCol}${totalsRow}`]);
    }
  };
  totals.gstBreakup.forEach((slab, slabIndex) => gstRowsFor(slab.gstAmount, slab.rate, false, slabIndex));
  if (totals.gstOnServices > 0) {
    gstRowsFor(totals.gstOnServices, totals.servicesGstRate, true, 0);
  }
  if (quote.additionalCharges) commRows.push(["Additional Charges", quote.additionalCharges]);
  if (quote.shippingCharges) commRows.push(["Shipping", quote.shippingCharges]);
  if (totals.roundOff !== 0) {
    commRows.push(["Round Off", totals.roundOff]);
  }
  commRows.push([
    "Grand Total",
    `=ROUND('BOQ Details'!${amtCol}${totalsRow}-${n(totals.discountAmount)}+${n(quote.additionalCharges)}+${n(quote.shippingCharges)}+${n(totals.installationCharge)}+${n(totals.gstOnServices)},0)`,
    true,
  ]);
  for (const [k, v, bold] of commRows) {
    const kc = summary.getCell(`A${r}`);
    const vc = summary.getCell(`B${r}`);
    kc.value = k;
    vc.value = v;
    kc.font = { bold: bold ?? true, size: 10 };
    vc.font = { bold: bold ?? false, size: 10 };
    vc.numFmt = currencyFmt;
    kc.border = thinBorder();
    vc.border = thinBorder();
    if (bold) {
      kc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
      vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
    }
    r += 1;
  }

  // Section-wise summary — one row per solution/section (only when 2+ sections)
  const sectionGroups = groupItemsBySection(quote.items);
  if (sectionsMode && sectionGroups.length >= 2) {
    r += 1;
    summary.mergeCells(`A${r}:F${r}`);
    const secHead = summary.getCell(`A${r}`);
    secHead.value = "Summary";
    secHead.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    secHead.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    r += 1;

    const secStats = sectionGroups.map((g) => sectionTotalsOf(g.items));
    const showInstallCol = secStats.some((st) => st.installation > 0 || st.gstOnInstallation > 0);

    const secCols: { header: string; key: string; width: number }[] = [
      { header: "Solution / Section", key: "name", width: 30 },
      { header: "Items", key: "items", width: 18 },
      { header: "Subtotal", key: "sub", width: 14 },
      { header: "GST", key: "gst", width: 14 },
      ...(showInstallCol
        ? [{ header: "Installation (incl. GST)", key: "inst", width: 20 }]
        : []),
      { header: "Total (incl. GST)", key: "total", width: 18 },
    ];
    secCols.forEach((c, i) => {
      const cell = summary.getCell(r, i + 1);
      cell.value = c.header;
      cell.font = { bold: true, size: 10, color: { argb: "FF374151" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_FILL } };
      cell.border = thinBorder();
      cell.alignment = { vertical: "middle" };
    });
    r += 1;

    const totalIdx = secCols.length; // 1-based index of the Total column

    sectionGroups.forEach((g, gi) => {
      const st = secStats[gi];
      const vals: (string | number)[] = [g.title, st.itemCount, st.subtotal, st.gst];
      if (showInstallCol) vals.push(round2(st.installation + st.gstOnInstallation));
      vals.push(st.total);
      vals.forEach((v, i) => {
        const cell = summary.getCell(r, i + 1);
        cell.value = v;
        cell.border = thinBorder();
        cell.font = { size: 10 };
        if (i >= 2) cell.numFmt = currencyFmt;
        if (i + 1 === totalIdx) cell.font = { size: 10, bold: true, color: { argb: "FF3730A3" } };
      });
      r += 1;
    });
  }

  r += 1;
  summary.getCell(`A${r}`).value = "Notes";
  summary.getCell(`A${r}`).font = { bold: true, size: 10 };
  summary.mergeCells(`B${r}:F${r + 2}`);
  summary.getCell(`B${r}`).value = quote.notes || "";
  summary.getCell(`B${r}`).alignment = { wrapText: true, vertical: "top" };
  r += 4;
  summary.getCell(`A${r}`).value = "Terms (summary)";
  summary.getCell(`A${r}`).font = { bold: true, size: 10 };
  summary.mergeCells(`B${r}:F${r + 4}`);
  summary.getCell(`B${r}`).value = quote.terms || "";
  summary.getCell(`B${r}`).alignment = { wrapText: true, vertical: "top" };

  summary.pageSetup.printArea = `A1:F${r + 5}`;

  const boq = wb.addWorksheet("BOQ Details", {
    properties: { defaultRowHeight: 18 },
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });

  const colOf = {
    sr: 1,
    photo: showPhotoCol ? 2 : 0,
    desc: showPhotoCol ? 3 : 2,
    brand: showPhotoCol ? 4 : 3,
    model: showPhotoCol ? 5 : 4,
    hsn: showPhotoCol ? 6 : 5,
    unit: showPhotoCol ? 7 : 6,
    qty: showPhotoCol ? 8 : 7,
    rate: showPhotoCol ? 9 : 8,
    disc: showPhotoCol ? 10 : 9,
    base: showPhotoCol ? 11 : 10,
    gst: showPhotoCol ? 12 : 11,
    gstAmt: showPhotoCol ? 13 : 12,
    amount: showPhotoCol ? 14 : 13,
    install: showInstallCol ? (showPhotoCol ? 15 : 14) : 0,
  };
  const colCount = showInstallCol ? (showPhotoCol ? 15 : 14) : (showPhotoCol ? 14 : 13);
  const L = (i: number) => String.fromCharCode(64 + i);

  const headers = [
    { header: "Sr", key: "sr", width: 6 },
    ...(showPhotoCol ? [{ header: "Photo", key: "photo", width: 15 }] : []),
    { header: "Description", key: "desc", width: 42 },
    { header: "Brand", key: "brand", width: 14 },
    { header: "Model", key: "model", width: 16 },
    { header: "HSN", key: "hsn", width: 10 },
    { header: "Unit", key: "unit", width: 8 },
    { header: "Qty", key: "qty", width: 9 },
    { header: "Rate", key: "rate", width: 13 },
    { header: "Disc %", key: "disc", width: 9 },
    { header: "Base Amount", key: "base", width: 14 },
    { header: "GST %", key: "gst", width: 8 },
    { header: "GST Amount", key: "gstAmt", width: 13 },
    { header: "Amount", key: "amount", width: 14 },
    ...(showInstallCol
      ? [{ header: "Unit Installation", key: "install", width: 16 }]
      : []),
  ];
  boq.columns = headers;

  const photoIds = new Map<string, number>();
  if (showPhotoCol) {
    const urls = new Set(
      quote.items.map((i) => i.product?.image).filter((u): u is string => !!u)
    );
    for (const u of urls) {
      const data = await loadPhotoDataUrl(u, 280, 0.8);
      if (!data?.startsWith("data:image/")) continue;
      const b64 = data.slice(data.indexOf(",") + 1);
      const extension = data.startsWith("data:image/png") ? "png" : "jpeg";
      try {
        photoIds.set(u, wb.addImage({ base64: b64, extension }));
      } catch {
        // skip unreadable image
      }
    }
  }

  const headerRow = boq.getRow(1);
  headerRow.height = 22;
  headers.forEach((_, i) => {
    const c = headerRow.getCell(i + 1);
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.border = thinBorder();
  });
  headerRow.eachCell((c) => {
    c.border = thinBorder();
  });

  let sr = 0;
  let rowIdx = 2;
  let openSection: { title: string; startRow: number } | null = null;

  const flushSectionTotal = () => {
    if (!openSection || openSection.startRow > rowIdx - 1) {
      openSection = null;
      return;
    }
    const row = boq.getRow(rowIdx);
    row.getCell(colOf.desc).value = `Section Total — ${openSection.title}`;
    row.getCell(colOf.desc).font = { bold: true, size: 11, color: { argb: "FF3730A3" } };
    row.getCell(colOf.base).value = fx(
      `SUM(${L(colOf.base)}${openSection.startRow}:${L(colOf.base)}${rowIdx - 1})`
    );
    row.getCell(colOf.gstAmt).value = fx(
      `SUM(${L(colOf.gstAmt)}${openSection.startRow}:${L(colOf.gstAmt)}${rowIdx - 1})`
    );
    row.getCell(colOf.amount).value = fx(
      `SUM(${L(colOf.amount)}${openSection.startRow}:${L(colOf.amount)}${rowIdx - 1})`
    );
    row.getCell(colOf.base).numFmt = currencyFmt;
    row.getCell(colOf.gstAmt).numFmt = currencyFmt;
    row.getCell(colOf.amount).numFmt = currencyFmt;
    if (showInstallCol) {
      row.getCell(colOf.install).value = fx(
        `SUMPRODUCT(${L(colOf.qty)}${openSection.startRow}:${L(colOf.qty)}${rowIdx - 1},${L(colOf.install)}${openSection.startRow}:${L(colOf.install)}${rowIdx - 1})`
      );
      row.getCell(colOf.install).numFmt = currencyFmt;
    }
    for (let i = 1; i <= colCount; i++) {
      const c = row.getCell(i);
      c.border = thinBorder();
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDD6FE" } };
      c.font = { ...c.font, bold: true };
    }
    openSection = null;
    rowIdx += 1;
  };

  quote.items.forEach((item) => {
    const row = boq.getRow(rowIdx);
    if (item.itemType === "SECTION") {
      if (!sectionsMode) return; // combined view: flatten — skip section header rows
      flushSectionTotal();
      const desc = row.getCell(colOf.desc);
      desc.value = cleanSectionTitle(item.description) || item.description;
      desc.font = { bold: true, color: { argb: "FF3730A3" }, size: 12 };
      for (let i = 1; i <= colCount; i++) {
        row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } };
        row.getCell(i).border = thinBorder();
      }
      row.height = 22;
      openSection = { title: cleanSectionTitle(item.description) || item.description, startRow: rowIdx + 1 };
      rowIdx += 1;
      return;
    }
    sr += 1;
    row.getCell(colOf.sr).value = sr;
    row.getCell(colOf.desc).value = item.description + (item.isOptional ? " [OPTIONAL]" : "");
    row.getCell(colOf.brand).value = item.brand || "";
    row.getCell(colOf.model).value = item.modelNumber || "";
    row.getCell(colOf.hsn).value = item.hsnCode || "";
    row.getCell(colOf.unit).value = item.unit;
    row.getCell(colOf.qty).value = item.quantity;
    row.getCell(colOf.rate).value = item.rate;
    row.getCell(colOf.disc).value = item.discount ? item.discount : null;
    row.getCell(colOf.base).value = fx(
      `${L(colOf.qty)}${rowIdx}*${L(colOf.rate)}${rowIdx}*(1-${L(colOf.disc)}${rowIdx}/100)`
    );
    row.getCell(colOf.gst).value = item.gstRate || 0;
    row.getCell(colOf.gstAmt).value = fx(
      `${L(colOf.base)}${rowIdx}*${L(colOf.gst)}${rowIdx}/100`
    );
    row.getCell(colOf.amount).value = fx(
      `${L(colOf.base)}${rowIdx}+${L(colOf.gstAmt)}${rowIdx}`
    );
    if (showInstallCol) {
      row.getCell(colOf.install).value = item.installationRate || 0;
      row.getCell(colOf.install).numFmt = numFmt;
    }

    row.getCell(colOf.rate).numFmt = numFmt;
    row.getCell(colOf.base).numFmt = numFmt;
    row.getCell(colOf.gstAmt).numFmt = numFmt;
    row.getCell(colOf.amount).numFmt = numFmt;
    row.getCell(colOf.qty).numFmt = "#,##0.##";
    row.getCell(colOf.disc).numFmt = "0.##";
    row.getCell(colOf.gst).numFmt = "0.##";

    for (let i = 1; i <= colCount; i++) {
      row.getCell(i).border = thinBorder();
      if (sr % 2 === 0) {
        row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_FILL } };
      }
    }
    if (item.isOptional) {
      row.getCell(colOf.desc).font = { color: { argb: "FF9A3412" }, size: 10 };
    }
    if (showPhotoCol) {
      const url = item.product?.image;
      const imgId = url ? photoIds.get(url) : undefined;
      if (imgId !== undefined) {
        row.height = 54;
        boq.addImage(imgId, {
          tl: { col: colOf.photo - 1 + 0.12, row: rowIdx - 1 + 0.06 },
          ext: { width: 58, height: 42 },
        });
      }
    }
    rowIdx += 1;
  });
  flushSectionTotal();

  const totalRow = boq.getRow(rowIdx);
  totalRow.getCell(colOf.disc).value = "TOTALS";
  totalRow.getCell(colOf.disc).font = { bold: true, size: 10 };
  // SUMIF on non-empty Sr column so section header/total rows are excluded.
  const srRange = `${L(colOf.sr)}2:${L(colOf.sr)}${rowIdx - 1}`;
  totalRow.getCell(colOf.base).value = fx(
    `SUMIF(${srRange},"<>",${L(colOf.base)}2:${L(colOf.base)}${rowIdx - 1})`
  );
  totalRow.getCell(colOf.gstAmt).value = fx(
    `SUMIF(${srRange},"<>",${L(colOf.gstAmt)}2:${L(colOf.gstAmt)}${rowIdx - 1})`
  );
  totalRow.getCell(colOf.amount).value = fx(
    `SUMIF(${srRange},"<>",${L(colOf.amount)}2:${L(colOf.amount)}${rowIdx - 1})`
  );
  if (showInstallCol) {
    totalRow.getCell(colOf.install).value = fx(
      `SUMPRODUCT(${L(colOf.install)}2:${L(colOf.install)}${rowIdx - 1},${L(colOf.qty)}2:${L(colOf.qty)}${rowIdx - 1})`
    );
    totalRow.getCell(colOf.install).numFmt = currencyFmt;
  }
  totalRow.getCell(colOf.base).numFmt = currencyFmt;
  totalRow.getCell(colOf.gstAmt).numFmt = currencyFmt;
  totalRow.getCell(colOf.amount).numFmt = currencyFmt;
  for (let i = 1; i <= colCount; i++) {
    totalRow.getCell(i).border = thinBorder();
    totalRow.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
    totalRow.getCell(i).font = { ...totalRow.getCell(i).font, bold: true };
  }

  boq.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colCount } };
  boq.pageSetup.printArea = `A1:${L(showInstallCol ? colOf.install : colOf.amount)}${rowIdx}`;
  boq.pageSetup.printTitlesRow = "1:1";

  const terms = wb.addWorksheet("Terms & Conditions", {
    properties: { defaultRowHeight: 18 },
    pageSetup: { paperSize: 9, orientation: "portrait" },
  });
  terms.columns = [{ width: 22 }, { width: 80 }];
  terms.mergeCells("A1:B1");
  const th = terms.getCell("A1");
  th.value = "Terms & Conditions";
  th.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  th.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  terms.getRow(1).height = 26;

  const termRows: [string, string][] = [
    ["Payment Terms", quote.paymentTerms || quote.terms || ""],
    ["Delivery & Installation", quote.deliveryTimeline || quote.installationScope || ""],
    ["Warranty", quote.warranty || ""],
    ["Technical Notes", quote.technicalNotes || ""],
    ["Exclusions", quote.exclusions || ""],
    ["Assumptions", quote.assumptions || ""],
    ["Notes", quote.notes || ""],
    ["Full Terms", quote.terms || ""],
    ["Bank Name", company.bankName || ""],
    ["Account Name", company.bankAccountName || ""],
    ["Account Number", company.bankAccountNumber || ""],
    ["IFSC", company.bankIfsc || ""],
    ["Branch", company.bankBranch || ""],
    ["Authorized Signatory", quote.authorizedSignatory || ""],
  ];

  let tr = 3;
  for (const [label, value] of termRows) {
    if (!value) continue;
    const lc = terms.getCell(`A${tr}`);
    const vc = terms.getCell(`B${tr}`);
    lc.value = label;
    vc.value = value;
    lc.font = { bold: true, size: 10, color: { argb: "FF374151" } };
    vc.font = { size: 10, color: { argb: "FF111827" } };
    lc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_FILL } };
    lc.border = thinBorder();
    vc.border = thinBorder();
    vc.alignment = { wrapText: true, vertical: "top" };
    const lineCount = Math.max(value.split("\n").length, Math.ceil(value.length / 90));
    terms.getRow(tr).height = Math.min(Math.max(lineCount * 14, 20), 160);
    tr += 1;
  }
  terms.pageSetup.printArea = `A1:B${tr}`;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${quote.quoteNumber}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function generateProductsExcel(
  products: {
    name: string;
    description?: string | null;
    sku?: string | null;
    brand?: string | null;
    modelNumber?: string | null;
    specifications?: string | null;
    subCategory?: string | null;
    costPrice?: number | null;
    unit: string;
    rate: number;
    gstRate: number;
    hsnCode?: string | null;
    isActive?: boolean;
    category?: { name: string } | null;
  }[]
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Products");
  ws.columns = [
    { header: "Name", key: "name", width: 32 },
    { header: "Category", key: "category", width: 20 },
    { header: "Sub Category", key: "subCategory", width: 18 },
    { header: "SKU", key: "sku", width: 14 },
    { header: "Brand", key: "brand", width: 16 },
    { header: "Model", key: "modelNumber", width: 18 },
    { header: "Specifications", key: "specifications", width: 40 },
    { header: "Description", key: "description", width: 36 },
    { header: "HSN", key: "hsnCode", width: 10 },
    { header: "Unit", key: "unit", width: 8 },
    { header: "Cost Price", key: "costPrice", width: 13 },
    { header: "Selling Rate", key: "rate", width: 13 },
    { header: "GST %", key: "gstRate", width: 8 },
    { header: "Active", key: "isActive", width: 8 },
  ];
  const headerRow = ws.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    c.border = thinBorder();
    c.alignment = { vertical: "middle", wrapText: true };
  });

  products.forEach((p, i) => {
    const row = ws.getRow(i + 2);
    row.getCell(1).value = p.name;
    row.getCell(2).value = p.category?.name || "";
    row.getCell(3).value = p.subCategory || "";
    row.getCell(4).value = p.sku || "";
    row.getCell(5).value = p.brand || "";
    row.getCell(6).value = p.modelNumber || "";
    row.getCell(7).value = p.specifications || "";
    row.getCell(8).value = p.description || "";
    row.getCell(9).value = p.hsnCode || "";
    row.getCell(10).value = p.unit;
    row.getCell(11).value = p.costPrice ?? "";
    row.getCell(12).value = p.rate;
    row.getCell(13).value = p.gstRate;
    row.getCell(14).value = p.isActive === false ? "No" : "Yes";
    row.getCell(11).numFmt = currencyFmt;
    row.getCell(12).numFmt = currencyFmt;
    row.eachCell((c) => {
      c.border = thinBorder();
    });
  });

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 14 } };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildProductImportRows(
  workbook: ExcelJS.Workbook
): Record<string, unknown>[] {
  const ws = workbook.worksheets[0];
  if (!ws) return [];
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim().toLowerCase();
  });

  const rows: Record<string, unknown>[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, unknown> = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headers[colNumber - 1];
      if (!key) return;
      let v: unknown = cell.value;
      if (v && typeof v === "object" && "result" in (v as object)) {
        v = (v as { result?: unknown }).result;
      }
      if (v !== null && v !== undefined && v !== "") hasValue = true;
      obj[key] = v;
    });
    if (hasValue && obj.name) rows.push(obj);
  });
  return rows;
}

export { round2 };
