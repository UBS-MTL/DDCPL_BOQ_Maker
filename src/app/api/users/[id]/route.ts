import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, serverError, notFound } from "@/lib/auth";
import { userUpdateSchema, parseOr400 } from "@/lib/validation";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return notFound("User not found");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseOr400(userUpdateSchema, body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone || null;
    if (parsed.data.email !== undefined) {
      if (parsed.data.email !== existing.email) {
        const dup = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (dup) {
          return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
        }
      }
      data.email = parsed.data.email;
    }
    if (parsed.data.role !== undefined) {
      if (existing.role === "admin" && parsed.data.role !== "admin") {
        const adminCount = await prisma.user.count({ where: { role: "admin" } });
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: "Cannot demote the last admin user" },
            { status: 409 }
          );
        }
      }
      data.role = parsed.data.role;
    }
    if (parsed.data.password) {
      data.password = await bcrypt.hash(parsed.data.password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return serverError("Failed to update user");
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
    if (auth.id === id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 409 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound("User not found");

    if (user.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot delete the last admin user" }, { status: 409 });
      }
    }

    // Reassign quotations to admin before deleting
    const admin = await prisma.user.findFirst({ where: { role: "admin" } });
    if (admin && admin.id !== id) {
      await prisma.quotation.updateMany({
        where: { userId: id },
        data: { userId: admin.id },
      });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Failed to delete user");
  }
}
