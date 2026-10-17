import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError } from "@/lib/auth";
import { calcQuotationTotals } from "@/lib/calc";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const salesPersons = await prisma.user.findMany({
      where: { role: "sales_person" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    const allQuotations = await prisma.quotation.findMany({
      where: { user: { role: "sales_person" } },
      include: { items: true, customer: true, user: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    });

    const team = salesPersons.map((person) => {
      const quotations = allQuotations.filter((q) => q.user.id === person.id);

      const totalQuotations = quotations.length;
      const approved = quotations.filter((q) => q.status === "approved");
      const sent = quotations.filter((q) => q.status === "sent");
      const rejected = quotations.filter(
        (q) => q.status === "rejected" || q.status === "lost"
      );
      const draft = quotations.filter((q) => q.status === "draft");

      const calcTotal = (qs: typeof quotations) =>
        qs.reduce((sum, q) => {
          return (
            sum +
            calcQuotationTotals({
              items: q.items,
              discountType: q.discountType,
              discountValue: q.discountValue,
              additionalCharges: q.additionalCharges,
              shippingCharges: q.shippingCharges,
            }).grandTotal
          );
        }, 0);

      const totalRevenue = calcTotal(approved);
      const pendingValue = calcTotal(sent);
      const conversionRate =
        totalQuotations > 0 ? Math.round((approved.length / totalQuotations) * 100) : 0;

      return {
        ...person,
        stats: {
          totalQuotations,
          approved: approved.length,
          sent: sent.length,
          rejected: rejected.length,
          draft: draft.length,
          totalRevenue,
          pendingValue,
          conversionRate,
        },
        recentQuotations: quotations.slice(0, 5).map((q) => ({
          id: q.id,
          quoteNumber: q.quoteNumber,
          title: q.title,
          status: q.status,
          customerName: q.customer?.name,
          createdAt: q.createdAt,
          rejectionReason: q.rejectionReason,
        })),
      };
    });

    return NextResponse.json(team);
  } catch {
    return serverError();
  }
}
