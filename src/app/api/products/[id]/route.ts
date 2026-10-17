import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError, notFound } from "@/lib/auth";
import { productSchema, parseOr400 } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) return notFound("Product not found");
    return NextResponse.json(product);
  } catch {
    return serverError();
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return notFound("Product not found");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseOr400(productSchema, body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { categoryId, ...data } = parsed.data;
    const product = await prisma.product.update({
      where: { id },
      data: { ...data, categoryId: categoryId || null },
    });
    return NextResponse.json(product);
  } catch (error) {
    console.error(error);
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "A product with this SKU already exists" }, { status: 409 });
    }
    return serverError("Failed to update product");
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
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return notFound("Product not found");

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Failed to delete product");
  }
}
