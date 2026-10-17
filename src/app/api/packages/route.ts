import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError } from "@/lib/auth";
import { packageSchema, parseOr400 } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(request.url);
    const solutionId = url.searchParams.get("solutionId") || undefined;

    const packages = await prisma.package.findMany({
      where: solutionId ? { solutionId } : undefined,
      include: {
        solution: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(packages);
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

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

    const created = await prisma.package.create({
      data: {
        ...pkgData,
        items: { create: items },
      },
      include: {
        solution: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError("Failed to create kit");
  }
}
