import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, serverError } from "@/lib/auth";
import { settingsUpdateSchema, parseOr400 } from "@/lib/validation";
import { logActivity } from "@/lib/activity";

async function getOrCreateSettings() {
  const existing = await prisma.companySetting.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return prisma.companySetting.create({ data: { id: "singleton" } });
}

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const settings = await getOrCreateSettings();
    const assets = await prisma.companyAsset.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ ...settings, assets });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function PUT(request: Request) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseOr400(settingsUpdateSchema, body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await getOrCreateSettings();
    const updated = await prisma.companySetting.update({
      where: { id: "singleton" },
      data: parsed.data,
    });

    await logActivity({
      userId: auth.id,
      action: "update",
      entity: "settings",
      entityId: "singleton",
      details: "Updated company settings",
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError("Failed to save settings");
  }
}
