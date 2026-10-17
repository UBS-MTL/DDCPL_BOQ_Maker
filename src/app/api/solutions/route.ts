import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError } from "@/lib/auth";
import { solutionSchema, parseOr400 } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const solutions = await prisma.solution.findMany({
      include: { vertical: true, packages: { include: { items: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(solutions);
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

    const solution = await prisma.solution.create({ data: parsed.data });
    return NextResponse.json(solution, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError("Failed to create solution");
  }
}
