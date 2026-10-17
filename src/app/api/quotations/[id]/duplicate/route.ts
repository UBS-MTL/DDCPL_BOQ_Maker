import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError, notFound, forbidden, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

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
    const candidate = `${base}-${(count + 1 + attempt).toString().padStart(4, "0")}`;
    const existing = await prisma.quotation.findUnique({
      where: { quoteNumber: candidate },
    });
    if (!existing) return candidate;
  }
  return `${base}-${Date.now().toString().slice(-6)}`;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const source = await prisma.quotation.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!source) return notFound("Quotation not found");
    if (!isAdmin(auth) && source.userId !== auth.id) {
      return forbidden();
    }

    const quoteNumber = await generateUniqueQuoteNumber();

    const duplicate = await prisma.quotation.create({
      data: {
        quoteNumber,
        title: source.title,
        description: source.description,
        status: "draft",
        revision: 1,
        validTill: source.validTill,
        discountType: source.discountType,
        discountValue: source.discountValue,
        additionalCharges: source.additionalCharges,
        shippingCharges: source.shippingCharges,
        installationCharge: source.installationCharge,
        taxExcluded: source.taxExcluded,
        notes: source.notes,
        terms: source.terms,
        rejectionReason: null,
        projectName: source.projectName,
        projectRef: source.projectRef,
        siteAddress: source.siteAddress,
        contactPerson: source.contactPerson,
        phone: source.phone,
        email: source.email,
        preparedBy: source.preparedBy,
        paymentTerms: source.paymentTerms,
        deliveryTimeline: source.deliveryTimeline,
        warranty: source.warranty,
        installationScope: source.installationScope,
        exclusions: source.exclusions,
        assumptions: source.assumptions,
        technicalNotes: source.technicalNotes,
        authorizedSignatory: source.authorizedSignatory,
        followUpDate: null,
        responseDeadline: null,
        submittedAt: null,
        subtotal: source.subtotal,
        gstAmount: source.gstAmount,
        discountAmount: source.discountAmount,
        grandTotal: source.grandTotal,
        parentQuotationId: source.id,
        userId: auth.id,
        customerId: source.customerId,
        items: {
          create: source.items.map((item, index) => ({
            description: item.description,
            itemType: item.itemType,
            brand: item.brand,
            modelNumber: item.modelNumber,
            specifications: item.specifications,
            hsnCode: item.hsnCode,
            unit: item.unit,
            quantity: item.quantity,
            rate: item.rate,
            discount: item.discount,
            gstRate: item.gstRate,
            installationRate: item.installationRate,
            isOptional: item.isOptional,
            lineTotal: item.lineTotal,
            sortOrder: index,
            productId: item.productId,
            solutionId: item.solutionId,
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
      action: "duplicate",
      entity: "quotation",
      entityId: duplicate.id,
      details: `Duplicated from ${source.quoteNumber} as ${quoteNumber}`,
    });

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError("Failed to duplicate quotation");
  }
}
