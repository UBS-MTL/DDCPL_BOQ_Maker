import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calcQuotationTotals } from "../src/lib/calc";

const prisma = new PrismaClient();

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash("Ddcpl@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ddcpl.com" },
    update: {},
    create: {
      email: "admin@ddcpl.com",
      password: hashedPassword,
      name: "Admin User",
      role: "admin",
    },
  });

  const salesPerson1 = await prisma.user.upsert({
    where: { email: "rahul@company.com" },
    update: {},
    create: {
      email: "rahul@company.com",
      password: hashedPassword,
      name: "Rahul Verma",
      role: "sales_person",
    },
  });

  const salesPerson2 = await prisma.user.upsert({
    where: { email: "priya@company.com" },
    update: {},
    create: {
      email: "priya@company.com",
      password: hashedPassword,
      name: "Priya Nair",
      role: "sales_person",
    },
  });

  const salesPerson3 = await prisma.user.upsert({
    where: { email: "amit@company.com" },
    update: {},
    create: {
      email: "amit@company.com",
      password: hashedPassword,
      name: "Amit Singh",
      role: "sales_person",
    },
  });

  console.log("Users ready: admin + 3 sales persons");

  const categoryDefs = [
    { name: "CCTV & Surveillance", color: "#ef4444", sortOrder: 1 },
    { name: "Access Control", color: "#f97316", sortOrder: 2 },
    { name: "Networking & Wi-Fi", color: "#10b981", sortOrder: 3 },
    { name: "IT Equipment", color: "#06b6d4", sortOrder: 4 },
    { name: "Furniture", color: "#6366f1", sortOrder: 5 },
    { name: "Cables, Accessories and Consumables", color: "#8b5cf6", sortOrder: 6 },
  ];
  const categories = [];
  for (const c of categoryDefs) {
    categories.push(
      await prisma.category.upsert({ where: { name: c.name }, update: { color: c.color, sortOrder: c.sortOrder }, create: c })
    );
  }

  const productDefs = [
    { name: "Office Chair - Ergonomic", description: "Premium ergonomic office chair with lumbar support", sku: "FRN-001", brand: "ErgoSeating", modelNumber: "ES-900", specifications: "Mesh back, adjustable lumbar, 3D armrests, weight capacity 120kg", costPrice: 10500, unit: "nos", rate: 15000, gstRate: 18, hsnCode: "9401", categoryId: categories[4].id },
    { name: "Executive Table", description: "Solid wood executive table 6x3 ft", sku: "FRN-002", brand: "WoodCraft", modelNumber: "WC-603", specifications: "Mahogany finish, 3 drawer pedestal, cable cutout", costPrice: 17500, unit: "nos", rate: 25000, gstRate: 18, hsnCode: "9403", categoryId: categories[4].id },
    { name: "Modular Sofa Set", description: "3-seater modular sofa with premium fabric", sku: "FRN-003", brand: "ComfortHub", modelNumber: "CH-3S", specifications: "Fabric upholstery, hardwood frame, 3 seats", costPrice: 32000, unit: "set", rate: 45000, gstRate: 18, hsnCode: "9401", categoryId: categories[4].id },
    { name: "Laptop - Dell Latitude", description: "Intel i7, 16GB RAM, 512GB SSD", sku: "ELEC-001", brand: "Dell", modelNumber: "Latitude 5540", specifications: "Intel Core i7-1355U, 16GB DDR5, 512GB NVMe, 15.6\" FHD, Win 11 Pro", costPrice: 72000, unit: "nos", rate: 85000, gstRate: 18, hsnCode: "8471", categoryId: categories[3].id },
    { name: "Monitor - 27 inch 4K", description: "Dell UltraSharp 27 4K USB-C Hub Monitor", sku: "ELEC-002", brand: "Dell", modelNumber: "U2723QE", specifications: "27\" 4K IPS Black, USB-C 90W PD, RJ45, 100% sRGB", costPrice: 28000, unit: "nos", rate: 35000, gstRate: 18, hsnCode: "8528", categoryId: categories[3].id },
    { name: "Printer - HP LaserJet", description: "HP LaserJet Pro M404dn Mono Printer", sku: "ELEC-003", brand: "HP", modelNumber: "M404dn", specifications: "Mono laser, 40ppm, duplex, Ethernet", costPrice: 18000, unit: "nos", rate: 22000, gstRate: 18, hsnCode: "8443", categoryId: categories[3].id },
    { name: "Server Rack - 42U", description: "Standard 42U server rack with cooling", sku: "IT-001", brand: "Rittal", modelNumber: "TS-IT-42", specifications: "42U, 800mm deep, perforated doors, fan kit, lockable", costPrice: 42000, unit: "nos", rate: 55000, gstRate: 18, hsnCode: "8473", categoryId: categories[3].id },
    { name: "UPS - 3KVA", description: "APC Smart-UPS 3000VA Line-Interactive", sku: "IT-002", brand: "APC", modelNumber: "SMT3000I", specifications: "3000VA/2700W, line-interactive, network card slot", costPrice: 35000, unit: "nos", rate: 42000, gstRate: 18, hsnCode: "8504", categoryId: categories[3].id },
    { name: "CCTV Camera - 4MP Dome", description: "4MP IR vandal-proof dome camera", sku: "CCTV-001", brand: "Hikvision", modelNumber: "DS-2CD2143G2-IS", specifications: "4MP, 30m IR, IP67, IK10, built-in mic", costPrice: 3200, unit: "nos", rate: 4500, gstRate: 18, hsnCode: "8525", categoryId: categories[0].id },
    { name: "NVR - 16 Channel", description: "16 channel network video recorder", sku: "CCTV-002", brand: "Hikvision", modelNumber: "DS-7716NI-K4", specifications: "16 ch, 4K output, 80Mbps, 2 SATA bays", costPrice: 12000, unit: "nos", rate: 16000, gstRate: 18, hsnCode: "8521", categoryId: categories[0].id },
    { name: "Biometric Access Controller", description: "Fingerprint + card access control terminal", sku: "AC-001", brand: "ZKTeco", modelNumber: "ProFace X", specifications: "Facial recognition, RFID card, TCP/IP, 50k users", costPrice: 18000, unit: "nos", rate: 24000, gstRate: 18, hsnCode: "8537", categoryId: categories[1].id },
    { name: "Network Switch - 24 Port", description: "Cisco CBS250-24T-4G Managed Switch", sku: "NET-001", brand: "Cisco", modelNumber: "CBS250-24T-4G", specifications: "24x Gigabit + 4x SFP, L2+, PoE options, 96Gbps", costPrice: 14500, unit: "nos", rate: 18000, gstRate: 18, hsnCode: "8517", categoryId: categories[2].id },
    { name: "WiFi Access Point", description: "Ubiquiti UniFi U6 Pro Access Point", sku: "NET-002", brand: "Ubiquiti", modelNumber: "U6-Pro", specifications: "Wi-Fi 6, 4x4 MU-MIMO, 5.3Gbps, PoE", costPrice: 11000, unit: "nos", rate: 14000, gstRate: 18, hsnCode: "8517", categoryId: categories[2].id },
    { name: "Cat6 Cable - 305m", description: "Cat6 UTP cable drum 305m", sku: "CAB-001", brand: "Finolex", modelNumber: "CAT6-305", specifications: "Pure copper, 23 AWG, 305m drum, LSZH", costPrice: 7500, unit: "drum", rate: 9500, gstRate: 18, hsnCode: "8544", categoryId: categories[5].id },
  ];

  const products = [];
  for (const p of productDefs) {
    products.push(
      await prisma.product.upsert({ where: { sku: p.sku }, update: p, create: p })
    );
  }
  console.log(`Products ready: ${products.length}`);

  const customerDefs = [
    { name: "Rajesh Kumar", email: "rajesh@techcorp.com", phone: "+91 98765 43211", company: "TechCorp Solutions", address: "456 Tech Park, Bangalore 560001", gstNumber: "29AABCT1234F1Z5" },
    { name: "Priya Sharma", email: "priya@innovate.in", phone: "+91 98765 43212", company: "Innovate Industries", address: "789 Industrial Area, Pune 411001", gstNumber: "27AABCI5678G1Z8" },
    { name: "Amit Patel", email: "amit@greenfield.co", phone: "+91 98765 43213", company: "Greenfield Enterprises", address: "321 Green Valley, Ahmedabad 380001", gstNumber: "24AABCG9012H1Z1" },
    { name: "Sneha Reddy", email: "sneha@dataflow.io", phone: "+91 98765 43214", company: "DataFlow Analytics", address: "654 IT Hub, Hyderabad 500001", gstNumber: "36AABCD3456J1Z4" },
    { name: "Vikram Singh", email: "vikram@buildright.com", phone: "+91 98765 43215", company: "BuildRight Construction", address: "987 Construction Zone, Delhi 110001", gstNumber: "07AABCB7890K1Z7" },
  ];
  const customers = [];
  for (const c of customerDefs) {
    const existing = await prisma.customer.findFirst({ where: { email: c.email } });
    customers.push(existing ?? (await prisma.customer.create({ data: c })));
  }

  const verticalDefs = [
    { name: "IT Infrastructure", description: "Complete IT infrastructure solutions for enterprises" },
    { name: "Office Solutions", description: "Complete office setup and furniture solutions" },
    { name: "Security Systems", description: "CCTV, access control, and security solutions" },
  ];
  const verticals = [];
  for (const v of verticalDefs) {
    verticals.push(
      await prisma.vertical.upsert({ where: { name: v.name }, update: {}, create: v })
    );
  }

  const solutionDefs = [
    { name: "Office Setup Package", description: "Complete office setup with furniture and IT equipment", verticalId: verticals[1].id },
    { name: "Server Room Setup", description: "Complete server room infrastructure", verticalId: verticals[0].id },
    { name: "Network Infrastructure", description: "Complete networking solution for offices", verticalId: verticals[0].id },
    { name: "CCTV Surveillance Kit", description: "4 camera dome setup with NVR", verticalId: verticals[2].id },
  ];
  const solutions = [];
  for (const s of solutionDefs) {
    const existing = await prisma.solution.findFirst({ where: { name: s.name } });
    solutions.push(existing ?? (await prisma.solution.create({ data: s })));
  }

  // Solution kits (Packages)
  const cctvKit = await prisma.package.upsert({
    where: { id: "seed-pkg-cctv-kit" },
    update: {},
    create: {
      id: "seed-pkg-cctv-kit",
      name: "4-Camera CCTV Kit",
      description: "4 dome cameras + 16ch NVR",
      solutionId: solutions[3].id,
      basePrice: 34000,
    },
  });
  const kitItemCount = await prisma.packageItem.count({ where: { packageId: cctvKit.id } });
  if (kitItemCount === 0) {
    await prisma.packageItem.createMany({
      data: [
        { packageId: cctvKit.id, productId: products[8].id, quantity: 4, rate: 4500, discount: 0 },
        { packageId: cctvKit.id, productId: products[9].id, quantity: 1, rate: 16000, discount: 0 },
      ],
    });
  }

  // Company settings singleton
  await prisma.companySetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      companyName: "Your Company Name",
      address: "123 Business Park, Mumbai 400001",
      phone: "+91 98765 43210",
      email: "info@yourcompany.com",
      gstNumber: "27AABCU9603R1ZM",
      website: "www.yourcompany.com",
      defaultTerms:
        "1. This quotation is valid for 30 days from the date of issue.\n2. Payment terms: 50% advance, 50% on delivery.\n3. Prices are exclusive of GST unless otherwise stated.\n4. Delivery within 2-3 weeks from the date of order confirmation.",
      defaultNotes: "Please review and confirm availability.",
    },
  });

  const quotationCount = await prisma.quotation.count();
  if (quotationCount === 0) {
    const quotations: {
      quoteNumber: string;
      title: string;
      status: string;
      userId: string;
      customerId: string;
      rejectionReason?: string;
      followUpDate?: Date;
      responseDeadline?: Date;
      projectName?: string;
      items: {
        description: string;
        brand?: string;
        modelNumber?: string;
        specifications?: string;
        hsnCode?: string;
        unit: string;
        quantity: number;
        rate: number;
        gstRate: number;
        sortOrder: number;
        productId?: string;
      }[];
    }[] = [
      {
        quoteNumber: "QT-2408-0001",
        title: "Office Furniture & IT Setup for TechCorp",
        status: "approved",
        userId: salesPerson1.id,
        customerId: customers[0].id,
        projectName: "TechCorp HQ Fitout",
        followUpDate: daysFromNow(2),
        items: [
          { description: "Office Chair - Ergonomic", brand: "ErgoSeating", modelNumber: "ES-900", hsnCode: "9401", unit: "nos", quantity: 10, rate: 15000, gstRate: 18, sortOrder: 0, productId: products[0].id },
          { description: "Executive Table", brand: "WoodCraft", modelNumber: "WC-603", hsnCode: "9403", unit: "nos", quantity: 5, rate: 25000, gstRate: 18, sortOrder: 1, productId: products[1].id },
        ],
      },
      {
        quoteNumber: "QT-2408-0002",
        title: "Laptop Bulk Order for Innovate",
        status: "sent",
        userId: salesPerson1.id,
        customerId: customers[1].id,
        projectName: "Device Refresh FY25",
        followUpDate: daysFromNow(-2),
        responseDeadline: daysFromNow(5),
        items: [
          { description: "Laptop - Dell Latitude", brand: "Dell", modelNumber: "Latitude 5540", hsnCode: "8471", unit: "nos", quantity: 20, rate: 85000, gstRate: 18, sortOrder: 0, productId: products[3].id },
          { description: "Monitor - 27 inch 4K", brand: "Dell", modelNumber: "U2723QE", hsnCode: "8528", unit: "nos", quantity: 20, rate: 35000, gstRate: 18, sortOrder: 1, productId: products[4].id },
        ],
      },
      {
        quoteNumber: "QT-2408-0003",
        title: "Network Setup for Greenfield",
        status: "rejected",
        userId: salesPerson1.id,
        customerId: customers[2].id,
        rejectionReason: "Customer found a cheaper vendor. Budget exceeded by 15%.",
        items: [
          { description: "Network Switch - 24 Port", brand: "Cisco", modelNumber: "CBS250-24T-4G", hsnCode: "8517", unit: "nos", quantity: 5, rate: 18000, gstRate: 18, sortOrder: 0, productId: products[11].id },
          { description: "WiFi Access Point", brand: "Ubiquiti", modelNumber: "U6-Pro", hsnCode: "8517", unit: "nos", quantity: 10, rate: 14000, gstRate: 18, sortOrder: 1, productId: products[12].id },
        ],
      },
      {
        quoteNumber: "QT-2408-0004",
        title: "Server Room Setup for DataFlow",
        status: "approved",
        userId: salesPerson2.id,
        customerId: customers[3].id,
        projectName: "Data Center Expansion",
        followUpDate: daysFromNow(7),
        items: [
          { description: "Server Rack - 42U", brand: "Rittal", modelNumber: "TS-IT-42", hsnCode: "8473", unit: "nos", quantity: 2, rate: 55000, gstRate: 18, sortOrder: 0, productId: products[6].id },
          { description: "UPS - 3KVA", brand: "APC", modelNumber: "SMT3000I", hsnCode: "8504", unit: "nos", quantity: 4, rate: 42000, gstRate: 18, sortOrder: 1, productId: products[7].id },
        ],
      },
      {
        quoteNumber: "QT-2408-0005",
        title: "Office Furniture for BuildRight",
        status: "sent",
        userId: salesPerson2.id,
        customerId: customers[4].id,
        responseDeadline: daysFromNow(1),
        items: [
          { description: "Modular Sofa Set", brand: "ComfortHub", modelNumber: "CH-3S", hsnCode: "9401", unit: "set", quantity: 3, rate: 45000, gstRate: 18, sortOrder: 0, productId: products[2].id },
          { description: "Office Chair - Ergonomic", brand: "ErgoSeating", modelNumber: "ES-900", hsnCode: "9401", unit: "nos", quantity: 15, rate: 15000, gstRate: 18, sortOrder: 1, productId: products[0].id },
        ],
      },
      {
        quoteNumber: "QT-2408-0006",
        title: "CCTV Surveillance for TechCorp",
        status: "draft",
        userId: salesPerson3.id,
        customerId: customers[0].id,
        projectName: "Office Security Upgrade",
        items: [
          { description: "CCTV Camera - 4MP Dome", brand: "Hikvision", modelNumber: "DS-2CD2143G2-IS", hsnCode: "8525", unit: "nos", quantity: 12, rate: 4500, gstRate: 18, sortOrder: 0, productId: products[8].id },
          { description: "NVR - 16 Channel", brand: "Hikvision", modelNumber: "DS-7716NI-K4", hsnCode: "8521", unit: "nos", quantity: 1, rate: 16000, gstRate: 18, sortOrder: 1, productId: products[9].id },
          { description: "Cat6 Cable - 305m", brand: "Finolex", modelNumber: "CAT6-305", hsnCode: "8544", unit: "drum", quantity: 2, rate: 9500, gstRate: 18, sortOrder: 2, productId: products[13].id },
        ],
      },
      {
        quoteNumber: "QT-2408-0007",
        title: "Access Control for DataFlow",
        status: "internal_review",
        userId: salesPerson3.id,
        customerId: customers[3].id,
        followUpDate: daysFromNow(3),
        items: [
          { description: "Biometric Access Controller", brand: "ZKTeco", modelNumber: "ProFace X", hsnCode: "8537", unit: "nos", quantity: 4, rate: 24000, gstRate: 18, sortOrder: 0, productId: products[10].id },
        ],
      },
    ];

    for (const q of quotations) {
      const { items, ...rest } = q;
      await prisma.quotation.create({
        data: {
          ...rest,
          validTill: daysFromNow(30),
          notes: "Please review and confirm availability.",
          terms: "1. Valid for 30 days.\n2. 50% advance, 50% on delivery.\n3. Prices exclusive of GST.\n4. Delivery within 2-3 weeks.",
          items: { create: items },
        },
      });
    }
    console.log(`Created ${quotations.length} quotations`);
  } else {
    console.log(`Quotations already exist (${quotationCount}), skipping quotation seed`);
  }

  console.log("Backfilling stored quotation totals (legacy rows)...");
  const legacy = await prisma.quotation.findMany({
    where: { grandTotal: 0, subtotal: 0, items: { some: {} } },
    include: { items: true },
  });
  for (const q of legacy) {
    const totals = calcQuotationTotals({
      items: q.items,
      discountType: q.discountType,
      discountValue: q.discountValue,
      additionalCharges: q.additionalCharges,
      shippingCharges: q.shippingCharges,
    });
    await prisma.quotation.update({
      where: { id: q.id },
      data: {
        subtotal: totals.subtotal,
        gstAmount: totals.totalGst,
        discountAmount: totals.discountAmount,
        grandTotal: totals.grandTotal,
      },
    });
  }
  console.log(`Backfilled totals for ${legacy.length} quotations`);

  console.log("Refreshing demo quotation dates/statuses...");
  const demoQuotes = await prisma.quotation.findMany({
    where: { quoteNumber: { startsWith: "QT-2408-" } },
    orderBy: { quoteNumber: "asc" },
  });
  const demoStatuses = [
    "approved",
    "sent",
    "approved",
    "rejected",
    "draft",
    "sent",
    "approved",
    "rejected",
    "sent",
    "approved",
  ];
  const followUpByIndex: Record<number, number> = { 0: 2, 5: 6, 8: 1 };
  for (let i = 0; i < demoQuotes.length; i++) {
    const q = demoQuotes[i];
    const created = new Date();
    created.setDate(created.getDate() - (i * 14 + 3));
    const validTill = daysFromNow(15 + i * 4);
    const restoredStatus = demoStatuses[i % demoStatuses.length];
    await prisma.quotation.update({
      where: { id: q.id },
      data: {
        createdAt: created,
        validTill,
        followUpDate: followUpByIndex[i] !== undefined ? daysFromNow(followUpByIndex[i]) : null,
        status: restoredStatus,
        rejectionReason:
          restoredStatus === "rejected" ? "Customer selected a competitor on pricing." : null,
      },
    });
  }
  await prisma.notification.deleteMany({ where: { type: "expired" } });
  console.log(`Refreshed ${demoQuotes.length} demo quotations`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
