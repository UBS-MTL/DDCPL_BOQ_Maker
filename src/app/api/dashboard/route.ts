import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError, isAdmin } from "@/lib/auth";
import { calcQuotationTotals } from "@/lib/calc";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const where = isAdmin(auth) ? {} : { userId: auth.id };

    const [
      totalQuotations,
      draftQuotations,
      sentQuotations,
      approvedQuotations,
      rejectedQuotations,
      totalCustomers,
      totalProducts,
    ] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.count({ where: { ...where, status: "draft" } }),
      prisma.quotation.count({ where: { ...where, status: "sent" } }),
      prisma.quotation.count({ where: { ...where, status: "approved" } }),
      prisma.quotation.count({ where: { ...where, status: "rejected" } }),
      prisma.customer.count(),
      prisma.product.count(),
    ]);

    const quotations = await prisma.quotation.findMany({
      where,
      include: { items: true },
    });

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    quotations.forEach((q) => {
      if (q.status === "approved" || q.status === "won") {
        const totals = calcQuotationTotals({
          items: q.items,
          discountType: q.discountType,
          discountValue: q.discountValue,
          additionalCharges: q.additionalCharges,
          shippingCharges: q.shippingCharges,
        });
        totalRevenue += totals.grandTotal;
        if (new Date(q.updatedAt) >= monthStart) {
          monthlyRevenue += totals.grandTotal;
        }
      }
    });

    const conversionRate =
      totalQuotations > 0 ? Math.round((approvedQuotations / totalQuotations) * 100) : 0;

    // Monthly trend: last 6 months
    const months: { key: string; label: string; quotations: number; revenue: number; won: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("en-IN", { month: "short" }),
        quotations: 0,
        revenue: 0,
        won: 0,
      });
    }
    const monthIndex = new Map(months.map((m, i) => [m.key, i]));

    const trendRows = await prisma.quotation.findMany({
      where: { ...where, createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
      select: { createdAt: true, status: true, grandTotal: true },
    });
    trendRows.forEach((q) => {
      const d = new Date(q.createdAt);
      const idx = monthIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (idx === undefined) return;
      months[idx].quotations += 1;
      if (q.status === "won" || q.status === "approved") {
        months[idx].revenue += q.grandTotal;
        months[idx].won += 1;
      }
    });

    // Full status distribution
    const statusAgg = await prisma.quotation.groupBy({
      by: ["status"],
      where,
      _count: { status: true },
    });
    const statusCounts = statusAgg.map((s) => ({ status: s.status, count: s._count.status }));

    // Upcoming follow-ups (including overdue), next 14 days
    const followUpHorizon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
    const upcomingFollowUps = await prisma.quotation.findMany({
      where: {
        ...where,
        followUpDate: { not: null, lte: followUpHorizon },
        status: { in: ["approved", "sent", "follow_up", "negotiation"] },
      },
      orderBy: { followUpDate: "asc" },
      take: 8,
      select: {
        id: true,
        quoteNumber: true,
        title: true,
        status: true,
        followUpDate: true,
        grandTotal: true,
        customer: { select: { name: true } },
      },
    });

    return NextResponse.json({
      totalQuotations,
      draftQuotations,
      sentQuotations,
      approvedQuotations,
      rejectedQuotations,
      totalRevenue,
      monthlyRevenue,
      totalCustomers,
      totalProducts,
      conversionRate,
      monthlyTrend: months,
      statusCounts,
      upcomingFollowUps,
    });
  } catch {
    return serverError("Failed to fetch stats");
  }
}
