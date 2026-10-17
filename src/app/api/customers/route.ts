import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError } from "@/lib/auth";
import { customerSchema, parseOr400 } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const customers = await prisma.customer.findMany({
      include: { _count: { select: { quotations: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(customers);
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

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
    const customer = await prisma.customer.create({
      data: { ...rest, email: email || null },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError("Failed to create customer");
  }
}
