import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError, notFound } from "@/lib/auth";
import { verticalSchema, parseOr400 } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.vertical.findUnique({ where: { id } });
    if (!existing) return notFound("Vertical not found");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseOr400(verticalSchema, body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (parsed.data.name !== existing.name) {
      const dup = await prisma.vertical.findUnique({
        where: { name: parsed.data.name },
      });
      if (dup) {
        return NextResponse.json({ error: "A vertical with this name already exists" }, { status: 409 });
      }
    }

    const vertical = await prisma.vertical.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(vertical);
  } catch (error) {
    console.error(error);
    return serverError("Failed to update vertical");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.vertical.findUnique({
      where: { id },
      include: { _count: { select: { solutions: true } } },
    });
    if (!existing) return notFound("Vertical not found");

    if (existing._count.solutions > 0) {
      return NextResponse.json(
        { error: "Cannot delete vertical with solutions. Remove its solutions first." },
        { status: 409 }
      );
    }

    await prisma.vertical.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Failed to delete vertical");
  }
}
