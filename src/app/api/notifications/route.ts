import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: auth.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          quotation: { select: { id: true, quoteNumber: true } },
        },
      }),
      prisma.notification.count({ where: { userId: auth.id, readAt: null } }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await prisma.notification.updateMany({
      where: { userId: auth.id, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
