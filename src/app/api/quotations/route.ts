import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError, isAdmin } from "@/lib/auth";
import { quotationSchema, parseOr400 } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { calcQuotationTotals } from "@/lib/calc";

function pad(n: number, len = 4) {
  return n.toString().padStart(len, "0");
}

async function generateUniqueQuoteNumber(): Promise<string> {
  const date = new Date();
  const prefix = "QT";
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const base = `${prefix}-${year}${month}`;

  for (let attempt = 0; attempt < 20; attempt++) {
    const count = await prisma.quotation.count({
      where: { quoteNumber: { startsWith: base } },
    });
    const candidate = `${base}-${pad(count + 1 + attempt)}`;
    const existing = await prisma.quotation.findUnique({
      where: { quoteNumber: candidate },
    });
    if (!existing) return candidate;
  }
  return `${base}-${Date.now().toString().slice(-6)}`;
}

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const where = isAdmin(auth) ? {} : { userId: auth.id };

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        customer: true,
        items: true,
        user: { select: { id: true, name: true, email: true, phone: true, role: true } },
        revisions: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(quotations);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseOr400(quotationSchema, body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const data = parsed.data;

    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      return NextResponse.json({ error: "Selected customer not found" }, { status: 400 });
    }

    const quoteNumber = await generateUniqueQuoteNumber();

    // Admins may assign any user as sales person; everyone else owns their quotation.
    let assignedUserId = auth.id;
    if (isAdmin(auth) && data.userId && data.userId !== auth.id) {
      const target = await prisma.user.findUnique({ where: { id: data.userId }, select: { id: true } });
      if (!target) return NextResponse.json({ error: "Selected user not found" }, { status: 400 });
      assignedUserId = target.id;
    }

    const totals = calcQuotationTotals({
      items: data.items,
      discountType: data.discountType,
      discountValue: data.discountValue,
      additionalCharges: data.additionalCharges,
      shippingCharges: data.shippingCharges,
      installationCharge: data.installationCharge,
    });

    const quotation = await prisma.quotation.create({
      data: {
        quoteNumber,
        title: data.title,
        description: data.description || null,
        status: data.status || "draft",
        validTill: data.validTill,
        discountType: data.discountType,
        discountValue: data.discountValue,
        additionalCharges: data.additionalCharges,
        shippingCharges: data.shippingCharges,
        installationCharge: data.installationCharge,
        taxExcluded: data.taxExcluded,
        notes: data.notes || null,
        terms: data.terms || null,
        rejectionReason: data.rejectionReason || null,
        projectName: data.projectName || null,
        projectRef: data.projectRef || null,
        siteAddress: data.siteAddress || null,
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        preparedBy: data.preparedBy || null,
        paymentTerms: data.paymentTerms || null,
        deliveryTimeline: data.deliveryTimeline || null,
        warranty: data.warranty || null,
        installationScope: data.installationScope || null,
        exclusions: data.exclusions || null,
        assumptions: data.assumptions || null,
        technicalNotes: data.technicalNotes || null,
        authorizedSignatory: data.authorizedSignatory || null,
        followUpDate: data.followUpDate,
        responseDeadline: data.responseDeadline,
        submittedAt: data.status === "sent" ? new Date() : null,
        subtotal: totals.subtotal,
        gstAmount: totals.totalGst,
        discountAmount: totals.discountAmount,
        grandTotal: totals.grandTotal,
        userId: assignedUserId,
        customerId: data.customerId,
        items: {
          create: data.items.map((item, index) => ({
            description: item.description,
            itemType: item.itemType,
            brand: item.brand || null,
            modelNumber: item.modelNumber || null,
            specifications: item.specifications || null,
            hsnCode: item.hsnCode || null,
            unit: item.unit,
            quantity: item.quantity,
            rate: item.rate,
            discount: item.discount,
            gstRate: item.gstRate,
            installationRate: item.installationRate,
            isOptional: item.isOptional,
            lineTotal: item.itemType === "SECTION" || item.isOptional ? 0 : totals.lineTotals[index]?.lineTotal ?? 0,
            sortOrder: index,
            productId: item.productId || null,
            solutionId: item.solutionId || null,
          })),
        },
      },
      include: {
        customer: true,
        items: true,
        user: { select: { id: true, name: true, email: true, phone: true, role: true } },
      },
    });

    await logActivity({
      userId: auth.id,
      action: "create",
      entity: "quotation",
      entityId: quotation.id,
      details: `Created quotation ${quoteNumber}`,
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError("Failed to create quotation");
  }
}
