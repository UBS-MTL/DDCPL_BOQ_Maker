import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError } from "@/lib/auth";
import { verticalSchema, parseOr400 } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const verticals = await prisma.vertical.findMany({
      include: { solutions: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(verticals);
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

    const parsed = parseOr400(verticalSchema, body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existing = await prisma.vertical.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return NextResponse.json({ error: "A vertical with this name already exists" }, { status: 409 });
    }

    const vertical = await prisma.vertical.create({ data: parsed.data });
    return NextResponse.json(vertical, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError("Failed to create vertical");
  }
}
