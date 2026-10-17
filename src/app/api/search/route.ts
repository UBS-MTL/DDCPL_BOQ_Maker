import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError, isAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ quotations: [], customers: [], products: [] });
  }

  try {
    const quoteWhere = isAdmin(auth) ? {} : { userId: auth.id };

    const [quotations, customers, products] = await Promise.all([
      prisma.quotation.findMany({
        where: {
          ...quoteWhere,
          OR: [
            { quoteNumber: { contains: q } },
            { title: { contains: q } },
            { customer: { name: { contains: q } } },
            { projectName: { contains: q } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          quoteNumber: true,
          title: true,
          status: true,
          grandTotal: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.customer.findMany({
        where: {
          OR: [{ name: { contains: q } }, { company: { contains: q } }, { email: { contains: q } }],
        },
        orderBy: { name: "asc" },
        take: 5,
        select: { id: true, name: true, company: true, phone: true },
      }),
      prisma.product.findMany({
        where: {
          isActive: true,
          OR: [{ name: { contains: q } }, { sku: { contains: q } }, { brand: { contains: q } }],
        },
        orderBy: { name: "asc" },
        take: 5,
        select: { id: true, name: true, sku: true, brand: true, rate: true },
      }),
    ]);

    return NextResponse.json({ quotations, customers, products });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
