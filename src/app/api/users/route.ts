import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError } from "@/lib/auth";
import { userCreateSchema, parseOr400 } from "@/lib/validation";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
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

    const parsed = parseOr400(userCreateSchema, body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { email, password, name, phone, role } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, phone: phone || null, role },
      select: { id: true, email: true, name: true, phone: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError("Failed to create user");
  }
}
