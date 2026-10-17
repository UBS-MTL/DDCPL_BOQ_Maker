import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, notFound, serverError } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(_request: Request, { params }: Params) {
  const auth = requireAuth(_request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== auth.id) return notFound("Not found");

    if (!notification.readAt) {
      await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
