import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError, notFound, forbidden, isAdmin } from "@/lib/auth";
import { quotationSchema, statusUpdateSchema, parseOr400 } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { calcQuotationTotals } from "@/lib/calc";

type Params = { params: Promise<{ id: string }> };

const USER_SELECT = { select: { id: true, name: true, email: true, phone: true, role: true } };

export async function GET(request: Request, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          orderBy: { sortOrder: "asc" },
          include: { product: { select: { image: true } } },
        },
        user: USER_SELECT,
        revisions: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!quotation) return notFound("Quotation not found");
    if (!isAdmin(auth) && quotation.userId !== auth.id) {
      return forbidden();
    }
    return NextResponse.json(quotation);
  } catch {
    return serverError();
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) return notFound("Quotation not found");
    if (!isAdmin(auth) && existing.userId !== auth.id) {
      return forbidden();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const bodyObj = body as Record<string, unknown>;
    const isStatusOnly =
      bodyObj &&
      typeof bodyObj === "object" &&
      !("title" in bodyObj) &&
      !("items" in bodyObj);

    if (isStatusOnly) {
      const parsedStatus = parseOr400(statusUpdateSchema, body);
      if ("error" in parsedStatus) {
        return NextResponse.json({ error: parsedStatus.error }, { status: 400 });
      }
      const { status, rejectionReason, newRevision } = parsedStatus.data;
      const statusChanged = status !== existing.status;

      if (statusChanged && status === "approved" && !isAdmin(auth)) {
        return NextResponse.json(
          { error: "Only admins can approve quotations" },
          { status: 403 }
        );
      }

      const bumpRevision = Boolean(newRevision);

      if (statusChanged || bumpRevision) {
        const snapshot = await prisma.quotation.findUnique({
          where: { id },
          include: { items: { orderBy: { sortOrder: "asc" } }, customer: true },
        });
        const notes = bumpRevision
          ? statusChanged
            ? `New revision v${existing.revision + 1} — status changed to ${status}`
            : `New revision v${existing.revision + 1}`
          : `Status changed from ${existing.status} to ${status}`;
        await prisma.revision.create({
          data: {
            quotationId: id,
            revision: existing.revision,
            changeNotes: notes,
            snapshot: JSON.stringify(snapshot),
          },
        });
      }

      const quotation = await prisma.quotation.update({
        where: { id },
        data: {
          status,
          rejectionReason:
            rejectionReason !== undefined ? rejectionReason || null : existing.rejectionReason,
          revision: bumpRevision ? existing.revision + 1 : existing.revision,
        },
        include: {
          customer: true,
          items: { orderBy: { sortOrder: "asc" } },
          user: USER_SELECT,
          revisions: { orderBy: { createdAt: "desc" } },
        },
      });

      await logActivity({
        userId: auth.id,
        action: "status_change",
        entity: "quotation",
        entityId: id,
        details: `Status ${existing.status} → ${status}`,
      });

      return NextResponse.json(quotation);
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

    if (isAdmin(auth) && data.userId && data.userId !== existing.userId) {
      const target = await prisma.user.findUnique({ where: { id: data.userId }, select: { id: true } });
      if (!target) return NextResponse.json({ error: "Selected user not found" }, { status: 400 });
    }

    const statusChanged = data.status !== existing.status;
    const itemsChanged = data.items.length > 0;
    const newRevision = typeof data.revision === "number" ? data.revision : existing.revision;
    const revisionChanged = newRevision !== existing.revision;

    const totals = calcQuotationTotals({
      items: data.items,
      discountType: data.discountType,
      discountValue: data.discountValue,
      additionalCharges: data.additionalCharges,
      shippingCharges: data.shippingCharges,
      installationCharge: data.installationCharge,
    });

    const quotation = await prisma.$transaction(async (tx) => {
      if (revisionChanged || statusChanged || itemsChanged) {
        const snapshot = await tx.quotation.findUnique({
          where: { id },
          include: { items: { orderBy: { sortOrder: "asc" } }, customer: true },
        });
        const notes = revisionChanged
          ? statusChanged
            ? `New revision v${newRevision} — status changed to ${data.status}`
            : `New revision v${newRevision}`
          : statusChanged
            ? `Status changed from ${existing.status} to ${data.status}`
            : "Content updated";
        await tx.revision.create({
          data: {
            quotationId: id,
            revision: existing.revision,
            changeNotes: notes,
            snapshot: JSON.stringify(snapshot),
          },
        });
      }

      await tx.quoteItem.deleteMany({ where: { quotationId: id } });

      const becomesSent = data.status === "sent" && existing.status !== "sent";

      return tx.quotation.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description || null,
          status: data.status,
          revision: newRevision,
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
          submittedAt: becomesSent ? new Date() : existing.submittedAt,
          subtotal: totals.subtotal,
          gstAmount: totals.totalGst,
          discountAmount: totals.discountAmount,
          grandTotal: totals.grandTotal,
          customerId: data.customerId,
          ...(isAdmin(auth) && data.userId && data.userId !== existing.userId
            ? { userId: data.userId }
            : {}),
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
          items: { orderBy: { sortOrder: "asc" } },
          user: USER_SELECT,
          revisions: { orderBy: { createdAt: "desc" } },
        },
      });
    });

    await logActivity({
      userId: auth.id,
      action: statusChanged ? "status_change" : "update",
      entity: "quotation",
      entityId: id,
      details: revisionChanged
        ? `New revision v${newRevision}`
        : statusChanged
          ? `Status ${existing.status} → ${data.status}`
          : `Updated quotation ${existing.quoteNumber}`,
    });

    return NextResponse.json(quotation);
  } catch (error) {
    console.error(error);
    return serverError("Failed to update quotation");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) return notFound("Quotation not found");
    if (!isAdmin(auth) && existing.userId !== auth.id) {
      return forbidden();
    }

    await prisma.quoteItem.deleteMany({ where: { quotationId: id } });
    await prisma.revision.deleteMany({ where: { quotationId: id } });
    await prisma.quotation.delete({ where: { id } });

    await logActivity({
      userId: auth.id,
      action: "delete",
      entity: "quotation",
      entityId: id,
      details: `Deleted quotation ${existing.quoteNumber}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Failed to delete quotation");
  }
}
