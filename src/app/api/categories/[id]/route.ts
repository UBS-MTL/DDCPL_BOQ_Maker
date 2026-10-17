import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError, notFound } from "@/lib/auth";
import { categorySchema, parseOr400 } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return notFound("Category not found");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseOr400(categorySchema, body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (parsed.data.name !== existing.name) {
      const dup = await prisma.category.findUnique({
        where: { name: parsed.data.name },
      });
      if (dup) {
        return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error(error);
    return serverError("Failed to update category");
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
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return notFound("Category not found");

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Failed to delete category");
  }
}
