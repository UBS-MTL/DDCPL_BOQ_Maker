import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError, notFound } from "@/lib/auth";
import { solutionSchema, parseOr400 } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.solution.findUnique({ where: { id } });
    if (!existing) return notFound("Solution not found");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseOr400(solutionSchema, body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const vertical = await prisma.vertical.findUnique({
      where: { id: parsed.data.verticalId },
    });
    if (!vertical) {
      return NextResponse.json({ error: "Selected vertical not found" }, { status: 400 });
    }

    const solution = await prisma.solution.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(solution);
  } catch (error) {
    console.error(error);
    return serverError("Failed to update solution");
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
    const existing = await prisma.solution.findUnique({
      where: { id },
      include: { _count: { select: { packages: true, quoteItems: true } } },
    });
    if (!existing) return notFound("Solution not found");

    if (existing._count.packages > 0) {
      return NextResponse.json(
        { error: "Cannot delete solution with packages. Remove its packages first." },
        { status: 409 }
      );
    }

    await prisma.solution.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Failed to delete solution");
  }
}
