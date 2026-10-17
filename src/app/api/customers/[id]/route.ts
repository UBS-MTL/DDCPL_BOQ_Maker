import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError, notFound, forbidden } from "@/lib/auth";
import { customerSchema, parseOr400 } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return notFound("Customer not found");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseOr400(customerSchema, body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { email, ...rest } = parsed.data;
    const customer = await prisma.customer.update({
      where: { id },
      data: { ...rest, email: email || null },
    });
    return NextResponse.json(customer);
  } catch (error) {
    console.error(error);
    return serverError("Failed to update customer");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== "admin") return forbidden("Admin access required");

    const { id } = await params;
    const existing = await prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { quotations: true } } },
    });
    if (!existing) return notFound("Customer not found");

    if (existing._count.quotations > 0) {
      return NextResponse.json(
        { error: "Cannot delete customer with existing quotations" },
        { status: 409 }
      );
    }

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Failed to delete customer");
  }
}
