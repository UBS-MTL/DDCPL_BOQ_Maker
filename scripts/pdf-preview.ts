import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { generateQuotationPdf } from "../src/lib/pdf";

// Resolve "/..." fetches (icons, tree, uploads) from disk so the Node preview matches the browser.
const origFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const s = String(input);
  if (s.startsWith("/")) {
    for (const dir of ["D:\\quotation-app\\public", "D:\\quotation-app\\uploads"]) {
      const file = path.join(dir, s.replace(/^\//, ""));
      if (fs.existsSync(file)) {
        const ext = path.extname(file).toLowerCase();
        const type =
          ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";
        return new Response(fs.readFileSync(file), { status: 200, headers: { "content-type": type } });
      }
    }
    return new Response("not found", { status: 404 });
  }
  return origFetch(input as RequestInfo, init);
}) as typeof fetch;

const outDir = process.argv[2] || "C:\\Users\\USER\\AppData\\Local\\Temp\\opencode\\pdfcheck";
fs.mkdirSync(outDir, { recursive: true });
process.chdir(outDir);

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.companySetting.findFirst();
  const readAsset = async (type: string) => {
    const asset = await prisma.companyAsset.findFirst({ where: { type, isActive: true } });
    if (!asset?.path) return null;
    const name = asset.path.split("/").pop() || "";
    const file = path.join("D:\\quotation-app\\uploads", name);
    if (!fs.existsSync(file)) return null;
    return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
  };
  let logoData: string | null = null;
  if (settings?.logoPath) {
    const name = settings.logoPath.split("/").pop() || "";
    const file = path.join("D:\\quotation-app\\uploads", name);
    if (fs.existsSync(file)) {
      logoData = `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
    }
  }
  const isoLogoPath = await readAsset("iso_badge");
  const memberLogoPath = await readAsset("member_badge");
  const company = {
    companyName: settings?.companyName ?? undefined,
    address: settings?.address ?? undefined,
    phone: settings?.phone ?? undefined,
    email: settings?.email ?? undefined,
    gstNumber: settings?.gstNumber ?? undefined,
    panNumber: settings?.panNumber ?? undefined,
    cinNumber: settings?.cinNumber ?? undefined,
    website: settings?.website ?? undefined,
    instagramUrl: settings?.instagramUrl ?? undefined,
    linkedinUrl: settings?.linkedinUrl ?? undefined,
    bankName: settings?.bankName ?? "HDFC BANK",
    bankAccountName: settings?.bankAccountName ?? "Dimension Digital Controlls PVT. LTD.",
    bankAccountNumber: settings?.bankAccountNumber ?? "50200049516850",
    bankIfsc: settings?.bankIfsc ?? "HDFC0000075",
    bankBranch: settings?.bankBranch ?? "Kodihalli, Bangalore - 560017",
    bankUpiId: settings?.bankUpiId ?? "dimensiondigital@upi",
    bankQrPath: settings?.bankQrPath ?? null,
    logoPath: logoData,
    signaturePath: null as string | null | undefined,
    isoLogoPath,
    memberLogoPath,
  };

  const q = await prisma.quotation.findFirst({
    orderBy: { updatedAt: "desc" },
    include: { items: true, customer: true },
  });
  if (!q) throw new Error("No quotation found");

  await generateQuotationPdf(
    {
      quoteNumber: q.quoteNumber,
      title: q.title,
      description: q.description,
      status: q.status,
      quoteDate: q.quoteDate || q.createdAt,
      validTill: q.validTill,
      discountType: q.discountType,
      discountValue: q.discountValue,
      additionalCharges: q.additionalCharges,
      shippingCharges: q.shippingCharges,
      notes: q.notes,
      terms: q.terms,
      projectName: q.projectName,
      projectRef: q.projectRef,
      siteAddress: q.siteAddress,
      contactPerson: q.contactPerson,
      phone: q.phone,
      email: q.email,
      preparedBy: q.preparedBy,
      paymentTerms: q.paymentTerms,
      deliveryTimeline: q.deliveryTimeline,
      warranty: q.warranty,
      installationScope: q.installationScope,
      exclusions: q.exclusions,
      assumptions: q.assumptions,
      technicalNotes: q.technicalNotes,
      authorizedSignatory: q.authorizedSignatory,
      revision: q.revision,
      installationCharge: 2500,
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
      items: q.items,
    },
    company,
    {}
  );
  console.log(`wrote ${q.quoteNumber}.pdf`);

  const items = [];
  for (let s = 1; s <= 3; s++) {
    items.push({
      itemType: "SECTION",
      description: `Section ${s}: Work Category ${s}`,
      quantity: 0,
      rate: 0,
      discount: 0,
      gstRate: 0,
    });
    for (let i = 1; i <= 6; i++) {
      items.push({
        itemType: "ITEM",
        description: `Item ${s}-${i} with a fairly long description to exercise wrapping in the description column`,
        brand: i % 2 ? "BrandX" : null,
        modelNumber: i % 2 ? `MDL-${s}${i}` : null,
        specifications: "Includes cable, mount & standard accessories; site installation included where applicable.",
        hsnCode: "8517",
        unit: i % 3 === 0 ? "Sq.Ft." : "nos",
        quantity: i * 2,
        rate: 12500 * i * (s === 2 ? 10 : 1),
        discount: i % 4 === 0 ? 5 : 0,
        gstRate: 18,
        isOptional: i === 5,
      });
    }
  }
  await generateQuotationPdf(
    {
      quoteNumber: "TEST-STRESS-001",
      title: "Multi-page stress test — Network & AV infrastructure with optional scope",
      description:
        "This synthetic quotation exercises multi-page tables, section rows, optional items, discounts, additional charges, long terms and page numbering.",
      status: "approved",
      quoteDate: new Date(),
      validTill: new Date(Date.now() + 30 * 86400000),
      discountType: "percentage",
      discountValue: 3,
      additionalCharges: 25000,
      shippingCharges: 15000,
      notes: "Site work will be executed during non-business hours.",
      terms:
        "1. This quotation is valid for 30 days from the date of issue.\n2. Payment terms: 50% advance, 50% on delivery.\n3. Prices are exclusive of GST unless otherwise stated.\n4. Delivery within 2-3 weeks from the date of order confirmation.\n5. Any additional work beyond the scope will be charged extra.\n6. Warranty as per manufacturer terms.\n7. Court jurisdiction: Bangalore.",
      projectName: "Phase-2 Office Buildout",
      projectRef: "PRJ-2026-089",
      siteAddress: "Tower B, 4th Floor, Outer Ring Road, Bangalore 560103",
      contactPerson: "Sneha Reddy",
      phone: "+91 98765 43214",
      email: "sneha@dataflow.io",
      preparedBy: "Rahul Verma",
      paymentTerms: "50% advance with PO, balance 50% before dispatch. Cheque/NEFT accepted.",
      deliveryTimeline: "3-4 weeks from PO.",
      installationScope: "Supply, fixing, testing & commissioning by vendor team.",
      warranty: "1 year on-site warranty from date of commissioning.",
      exclusions: "Civil works, power supply points and networking infrastructure at site.",
      assumptions: "Work will be executed in a single continuous schedule without force majeure.",
      authorizedSignatory: "Rahul Verma",
      installationCharge: 2500,
      customer: {
        name: "Sneha Reddy",
        company: "DataFlow Analytics",
        email: "sneha@dataflow.io",
        phone: "+91 98765 43214",
        address: "654 IT Hub, Hyderabad 500001",
        gstNumber: "36AABCD3456J1Z4",
      },
      items,
    },
    company,
    {}
  );
  console.log("wrote TEST-STRESS-001.pdf");

  const photoA = fs.existsSync("D:\\quotation-app\\uploads\\logo.png")
    ? `data:image/png;base64,${fs.readFileSync("D:\\quotation-app\\uploads\\logo.png").toString("base64")}`
    : null;
  const photoB = fs.existsSync("D:\\quotation-app\\uploads\\iso-test.png")
    ? `data:image/png;base64,${fs.readFileSync("D:\\quotation-app\\uploads\\iso-test.png").toString("base64")}`
    : null;
  await generateQuotationPdf(
    {
      quoteNumber: "TEST-PHOTOS-001",
      title: "BOQ with product photos",
      description: "Verifies the Photo column layout, row heights and mixed photo/no-photo rows.",
      status: "sent",
      quoteDate: new Date(),
      validTill: new Date(Date.now() + 15 * 86400000),
      discountType: "percentage",
      discountValue: 0,
      additionalCharges: 0,
      shippingCharges: 0,
      installationCharge: 2500,
      paymentTerms: "50% advance, balance on delivery.",
      deliveryTimeline: "2-3 weeks.",
      installationScope: "Supply & commissioning.",
      warranty: "1 year on-site.",
      authorizedSignatory: "Rahul Verma",
      customer: {
        name: "Photo Test",
        company: "PixelAV Systems",
        email: "test@example.com",
        phone: "+91 98765 43210",
        address: "12 MG Road, Bangalore 560001",
        gstNumber: "29AABCD1234E1Z5",
      },
      items: [
        { itemType: "SECTION", description: "Network Infrastructure", quantity: 0, rate: 0, discount: 0, gstRate: 0 },
        {
          itemType: "ITEM",
          description: "Digilux Network Controller with photo",
          brand: "Digilux",
          modelNumber: "DLC-200",
          hsnCode: "8517",
          unit: "nos",
          quantity: 1,
          rate: 48500,
          discount: 0,
          gstRate: 18,
          product: { image: photoA },
        },
        {
          itemType: "ITEM",
          description: "Capacitive Touch Switch 8M with photo",
          brand: "Digilux",
          modelNumber: "8S1F",
          hsnCode: "8536",
          unit: "nos",
          quantity: 4,
          rate: 7887.55,
          discount: 0,
          gstRate: 18,
          product: { image: photoB },
        },
        {
          itemType: "ITEM",
          description: "Manual row without any product photo — cell should stay blank",
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
      ],
    },
    company,
    { includePhotos: true }
  );
  console.log("wrote TEST-PHOTOS-001.pdf");
}

main().finally(() => prisma.$disconnect());
