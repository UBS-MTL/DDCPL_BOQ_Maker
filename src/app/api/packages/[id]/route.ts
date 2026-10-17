import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError, notFound } from "@/lib/auth";
import { packageSchema, parseOr400 } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.package.findUnique({ where: { id } });
    if (!existing) return notFound("Kit not found");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseOr400(packageSchema, body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { items, ...pkgData } = parsed.data;

    const solution = await prisma.solution.findUnique({ where: { id: pkgData.solutionId } });
    if (!solution) {
      return NextResponse.json({ error: "Selected solution not found" }, { status: 400 });
    }

    if (items.length > 0) {
      const productIds = [...new Set(items.map((i) => i.productId))];
      const productCount = await prisma.product.count({ where: { id: { in: productIds } } });
      if (productCount !== productIds.length) {
        return NextResponse.json({ error: "One or more products not found" }, { status: 400 });
      }
    }

    const updated = await prisma.package.update({
      where: { id },
      data: {
        ...pkgData,
        items: {
          deleteMany: {},
          create: items,
        },
      },
      include: {
        solution: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError("Failed to update kit");
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
    const existing = await prisma.package.findUnique({ where: { id } });
    if (!existing) return notFound("Kit not found");

    await prisma.package.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Failed to delete kit");
  }
}
