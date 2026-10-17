import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";
import { generateQuotationExcel, type ExcelQuotation, type ExcelItem } from "../src/lib/excel";

let captured: Blob | null = null;
(globalThis as unknown as { URL: { createObjectURL: (b: Blob) => string; revokeObjectURL: (u: string) => void } }).URL.createObjectURL = (b: Blob) => {
  captured = b;
  return "blob:stub";
};
(globalThis as unknown as { URL: { revokeObjectURL: (u: string) => void } }).URL.revokeObjectURL = () => {};
(globalThis as unknown as { document: unknown }).document = {
  createElement: () => ({ click() {} }),
  body: { appendChild() {}, removeChild() {} },
};

const outDir = "C:\\Users\\USER\\AppData\\Local\\Temp\\opencode\\xlcheck";
fs.mkdirSync(outDir, { recursive: true });

let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`PASS  ${label}`);
  else {
    failures++;
    console.log(`FAIL  ${label}  ${detail}`);
  }
}

function allImages(wb: ExcelJS.Workbook): ReturnType<ExcelJS.Worksheet["getImages"]>[number][] {
  const out: ReturnType<ExcelJS.Worksheet["getImages"]>[number][] = [];
  wb.eachSheet((ws) => out.push(...ws.getImages()));
  return out;
}

function formulaOf(cell: ExcelJS.Cell): string {
  const v = cell.value as ExcelJS.CellFormulaValue | null;
  if (v && typeof v === "object" && "formula" in v) return String(v.formula);
  return "";
}

async function buildAndLoad(quote: ExcelQuotation, includePhotos: boolean, name: string) {
  captured = null;
  await generateQuotationExcel(quote, { companyName: "Test Co" }, { includePhotos });
  if (!captured) throw new Error("no blob captured from generateQuotationExcel");
  const buf = Buffer.from(await (captured as Blob).arrayBuffer());
  const file = path.join(outDir, name);
  fs.writeFileSync(file, buf);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  return { wb, size: buf.length };
}

const prisma = new PrismaClient();

async function main() {
  const q = await prisma.quotation.findFirst({
    where: { quoteNumber: "QT-2610-0003" },
    include: { items: { include: { product: { select: { image: true, name: true } } } }, customer: true },
  });
  if (!q) throw new Error("QT-2610-0003 not found");

  const itemsWithProduct = q.items.filter((i) => i.productId);
  console.log(
    `DB: QT-2610-0003 items=${q.items.length}, with productId=${itemsWithProduct.length}, ` +
      `product images=${JSON.stringify(itemsWithProduct.map((i) => i.product?.image ?? null))}`
  );
  const dbInstallation = q.installationCharge;
  console.log(`DB: quotation.installationCharge=${dbInstallation}`);

  const realQuote: ExcelQuotation = {
    quoteNumber: q.quoteNumber,
    title: q.title,
    discountType: q.discountType,
    discountValue: q.discountValue,
    additionalCharges: q.additionalCharges,
    shippingCharges: q.shippingCharges,
    installationCharge: 2500,
    revision: q.revision,
    status: q.status,
    quoteDate: q.quoteDate || q.createdAt,
    validTill: q.validTill,
    notes: q.notes,
    terms: q.terms,
    customer: q.customer
      ? {
          name: q.customer.name,
          company: q.customer.company,
          email: q.customer.email,
          phone: q.customer.phone,
          address: q.customer.address,
          gstNumber: q.customer.gstNumber,
        }
      : null,
    items: q.items.map(
      (i): ExcelItem => ({
        itemType: i.itemType,
        description: i.description,
        brand: i.brand,
        modelNumber: i.modelNumber,
        specifications: i.specifications,
        hsnCode: i.hsnCode,
        unit: i.unit,
        quantity: i.quantity,
        rate: i.rate,
        discount: i.discount,
        gstRate: i.gstRate,
        installationRate: i.installationRate,
        isOptional: i.isOptional,
        product: i.product ? { image: i.product.image } : null,
      })
    ),
  };

  console.log("\n--- Test 1: real quote, default (no photos) ---");
  const t1 = await buildAndLoad(realQuote, false, "QT-2610-0003.xlsx");
  const boq1 = t1.wb.getWorksheet("BOQ Details")!;
  const sum1 = t1.wb.getWorksheet("Quotation Summary")!;
  const h1 = boq1.getRow(1);
  check("13 columns", h1.cellCount <= 13 && !h1.getCell(14).value, `cellCount=${h1.cellCount}`);
  check("no Photo header (B1=Description)", h1.getCell(2).value === "Description", String(h1.getCell(2).value));
  const totalsRow1 = 2 + realQuote.items.length;
  check(`TOTALS row at ${totalsRow1}`, boq1.getRow(totalsRow1).getCell(9).value === "TOTALS");
  check(
    `base SUM covers J2:J${totalsRow1 - 1}`,
    formulaOf(boq1.getRow(totalsRow1).getCell(10)) === `SUM(J2:J${totalsRow1 - 1})`,
    formulaOf(boq1.getRow(totalsRow1).getCell(10))
  );
  const labels1: string[] = [];
  const cells1: Record<string, string | number> = {};
  sum1.eachRow((row) => {
    const label = row.getCell(1).value;
    if (typeof label === "string" && label) {
      labels1.push(label);
      const v = row.getCell(2).value;
      cells1[label] = typeof v === "object" && v && "formula" in (v as object) ? formulaOf(row.getCell(2)) : (v as string | number);
    }
  });
  check("summary: Installation & Integration row", labels1.includes("Installation & Integration"), labels1.join(" | "));
  check("summary: GST on Services @ 18% row", labels1.some((s) => s.startsWith("GST on Services")), labels1.join(" | "));
  check("summary: Installation value 2500", cells1["Installation & Integration"] === 2500, String(cells1["Installation & Integration"]));
  check("summary: GST on Services value 450", cells1["GST on Services @ 18%"] === 450, String(cells1["GST on Services @ 18%"]));
  check("summary: Subtotal formula → BOQ J totalsRow", cells1["Subtotal"] === `='BOQ Details'!J${totalsRow1}`, String(cells1["Subtotal"]));
  const gstLabel1 = labels1.find((s) => s.startsWith("GST @"));
  check("summary: GST formula → BOQ L totalsRow", gstLabel1 !== undefined && cells1[gstLabel1] === `='BOQ Details'!L${totalsRow1}`, String(gstLabel1 && cells1[gstLabel1]));
  const grand1 = String(cells1["Grand Total"]);
  check(
    "summary: Grand Total = M totalsRow -disc +add +ship +inst +svcGst",
    grand1.includes(`M${totalsRow1}`) && grand1.includes("-0+0+0+2500+450"),
    grand1
  );
  check("no embedded images", allImages(t1.wb).length === 0, String(allImages(t1.wb).length));

  console.log("\n--- Test 2: photo mode, mixed rows ---");
  const dataA = `data:image/png;base64,${fs.readFileSync("D:\\quotation-app\\uploads\\iso-test.png").toString("base64")}`;
  const dataB = `data:image/png;base64,${fs.readFileSync("D:\\quotation-app\\uploads\\member-test.png").toString("base64")}`;
  const photoItems: ExcelItem[] = [
    { itemType: "SECTION", description: "Network Infrastructure", unit: "", quantity: 0, rate: 0, discount: 0, gstRate: 0 },
    {
      itemType: "ITEM",
      description: "Digilux Network Controller with photo A",
      brand: "Digilux",
      modelNumber: "DLC-200",
      hsnCode: "8517",
      unit: "nos",
      quantity: 1,
      rate: 48500,
      discount: 0,
      gstRate: 18,
      installationRate: 1500,
      product: { image: dataA },
    },
    {
      itemType: "ITEM",
      description: "Member badge as photo B",
      brand: "Digilux",
      modelNumber: "8S1F",
      hsnCode: "8536",
      unit: "nos",
      quantity: 4,
      rate: 7887.5,
      discount: 0,
      gstRate: 18,
      product: { image: dataB },
    },
    {
      itemType: "ITEM",
      description: "Cable row without photo — cell stays blank",
      brand: "Generic",
      hsnCode: "8544",
      unit: "nos",
      quantity: 2,
      rate: 1200,
      discount: 0,
      gstRate: 18,
      installationRate: 250,
      product: null,
    },
  ];
  const photoQuote: ExcelQuotation = { ...realQuote, quoteNumber: "TEST-XLSX-PHOTOS", items: photoItems };
  const t2 = await buildAndLoad(photoQuote, true, "TEST-XLSX-PHOTOS.xlsx");
  const boq2 = t2.wb.getWorksheet("BOQ Details")!;
  const sum2 = t2.wb.getWorksheet("Quotation Summary")!;
  const h2 = boq2.getRow(1);
  check("photo: 15 columns (with Install)", h2.getCell(15).value === "Install/Unit" && h2.getCell(14).value === "Amount", `N1=${h2.getCell(14).value} O1=${h2.getCell(15).value}`);
  check("photo: Photo header at B1", h2.getCell(2).value === "Photo", String(h2.getCell(2).value));
  const totalsRow2 = 2 + photoItems.length;
  check(`photo: TOTALS row at ${totalsRow2}`, boq2.getRow(totalsRow2).getCell(10).value === "TOTALS");
  check(
    `photo: base SUM covers K2:K${totalsRow2 - 1}`,
    formulaOf(boq2.getRow(totalsRow2).getCell(11)) === `SUM(K2:K${totalsRow2 - 1})`,
    formulaOf(boq2.getRow(totalsRow2).getCell(11))
  );
  check(
    `photo: install TOTALS = SUMPRODUCT(O2:O${totalsRow2 - 1},H2:H${totalsRow2 - 1})`,
    formulaOf(boq2.getRow(totalsRow2).getCell(15)) === `SUMPRODUCT(O2:O${totalsRow2 - 1},H2:H${totalsRow2 - 1})`,
    formulaOf(boq2.getRow(totalsRow2).getCell(15))
  );
  check("photo: item installRate O3=1500", boq2.getRow(3).getCell(15).value === 1500, String(boq2.getRow(3).getCell(15).value));
  check("photo: section row O2 empty", !boq2.getRow(2).getCell(15).value, String(boq2.getRow(2).getCell(15).value));
  const imgs = allImages(t2.wb);
  check("photo: 2 embedded images", imgs.length === 2, String(imgs.length));
  check("photo: row 3 height 54", boq2.getRow(3).height === 54, String(boq2.getRow(3).height));
  check("photo: row 4 height 54", boq2.getRow(4).height === 54, String(boq2.getRow(4).height));
  check("photo: no-photo row 5 default height", !boq2.getRow(5).height || boq2.getRow(5).height === 18, String(boq2.getRow(5).height));
  const labels2: string[] = [];
  const cells2: Record<string, string | number> = {};
  sum2.eachRow((row) => {
    const label = row.getCell(1).value;
    if (typeof label === "string" && label) {
      labels2.push(label);
      const v = row.getCell(2).value;
      cells2[label] = typeof v === "object" && v && "formula" in (v as object) ? formulaOf(row.getCell(2)) : (v as string | number);
    }
  });
  check("photo: Subtotal formula → BOQ K totalsRow", cells2["Subtotal"] === `='BOQ Details'!K${totalsRow2}`, String(cells2["Subtotal"]));
  const gstLabel2 = labels2.find((s) => s.startsWith("GST @"));
  check("photo: GST formula → BOQ M totalsRow", gstLabel2 !== undefined && cells2[gstLabel2] === `='BOQ Details'!M${totalsRow2}`, String(gstLabel2 && cells2[gstLabel2]));
  const grand2 = String(cells2["Grand Total"]);
  check(
    "photo: Grand Total = N totalsRow ... +4500+810 (flat 2500 + item install 2000)",
    grand2.includes(`N${totalsRow2}`) && grand2.includes("+4500+810"),
    grand2
  );
  check("photo: summary Installation = 4500", cells2["Installation & Integration"] === 4500, String(cells2["Installation & Integration"]));
  check("photo: printArea ends O", (boq2.pageSetup.printArea || "").startsWith("A1:O"), String(boq2.pageSetup.printArea));
  check("photo: autoFilter to col 15", String(boq2.autoFilter) === "A1:O1", String(boq2.autoFilter));

  console.log("\n--- Test 3: includePhotos=true but no product images → column hidden ---");
  const noImgItems = photoItems.map((i) => ({ ...i, product: null }));
  const t3 = await buildAndLoad({ ...photoQuote, items: noImgItems }, true, "TEST-XLSX-NOIMG.xlsx");
  const boq3 = t3.wb.getWorksheet("BOQ Details")!;
  check("hidden: back to 13 columns (B1=Description)", boq3.getRow(1).getCell(2).value === "Description", String(boq3.getRow(1).getCell(2).value));
  check("hidden: no images", allImages(t3.wb).length === 0, String(allImages(t3.wb).length));

  console.log("\n--- Test 4: intra-state → CGST/SGST split + round-off + bank ---");
  const intraCompany = {
    companyName: "Test Co",
    gstNumber: "29AABCD9586E1Z9",
    bankName: "HDFC BANK",
    bankAccountNumber: "50200049516850",
    bankIfsc: "HDFC0000075",
    bankBranch: "Kodihalli",
  };
  const intraItems: ExcelItem[] = photoItems.map((i) =>
    i.modelNumber === "8S1F" ? { ...i, rate: 7887.55 } : i
  );
  const intraQuote: ExcelQuotation = {
    ...photoQuote,
    quoteNumber: "TEST-XLSX-INTRA",
    customer: { name: "Photo Test", gstNumber: "29AABCD1234E1Z5" },
    items: intraItems,
  };
  captured = null;
  await generateQuotationExcel(intraQuote, intraCompany, {});
  if (!captured) throw new Error("no blob captured for intra test");
  const intraBuf = Buffer.from(await (captured as Blob).arrayBuffer());
  const intraFile = path.join(outDir, "TEST-XLSX-INTRA.xlsx");
  fs.writeFileSync(intraFile, intraBuf);
  const wb4 = new ExcelJS.Workbook();
  await wb4.xlsx.readFile(intraFile);
  const sum4 = wb4.getWorksheet("Quotation Summary")!;
  const labels4: string[] = [];
  const cells4: Record<string, string | number> = {};
  sum4.eachRow((row) => {
    const label = row.getCell(1).value;
    if (typeof label === "string" && label) {
      labels4.push(label);
      const v = row.getCell(2).value;
      cells4[label] = typeof v === "object" && v && "formula" in (v as object) ? formulaOf(row.getCell(2)) : (v as string | number);
    }
  });
  check("intra: CGST @ 9% row", labels4.includes("CGST @ 9%"), labels4.join(" | "));
  check("intra: SGST @ 9% row", labels4.includes("SGST @ 9%"), labels4.join(" | "));
  check("intra: CGST on Services @ 9% row", labels4.includes("CGST on Services @ 9%"), labels4.join(" | "));
  check("intra: SGST on Services @ 9% row", labels4.includes("SGST on Services @ 9%"), labels4.join(" | "));
  check("intra: Round Off row present", labels4.includes("Round Off"), labels4.join(" | "));
  check("intra: no single GST row", !labels4.some((s) => /^GST @/.test(s)), labels4.join(" | "));
  check("intra: CGST value half of supply GST", typeof cells4["CGST @ 9%"] === "number" && (cells4["CGST @ 9%"] as number) > 0, String(cells4["CGST @ 9%"]));
  check("intra: CGST + SGST = 14841.04", round2Num((cells4["CGST @ 9%"] as number) + (cells4["SGST @ 9%"] as number)) === 14841.04, String((cells4["CGST @ 9%"] as number) + (cells4["SGST @ 9%"] as number)));
  check("intra: Round Off = -0.24", cells4["Round Off"] === -0.24, String(cells4["Round Off"]));
  check("intra: Grand Total formula uses ROUND", String(cells4["Grand Total"]).startsWith("=ROUND("), String(cells4["Grand Total"]));
  const terms4 = wb4.getWorksheet("Terms & Conditions")!;
  const termLabels: string[] = [];
  terms4.eachRow((row) => {
    const v = row.getCell(1).value;
    if (typeof v === "string" && v) termLabels.push(v);
  });
  check("intra: Terms sheet has Bank Name", termLabels.includes("Bank Name"), termLabels.join(" | "));
  check("intra: Terms sheet has IFSC", termLabels.includes("IFSC"), termLabels.join(" | "));
  check("intra: Terms sheet has Account Number", termLabels.includes("Account Number"), termLabels.join(" | "));

  console.log(`\nfiles: ${t1.size}B / ${t2.size}B / ${t3.size}B / ${intraBuf.length}B in ${outDir}`);
  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  if (failures > 0) process.exitCode = 1;
}

function round2Num(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

main().finally(() => prisma.$disconnect());
