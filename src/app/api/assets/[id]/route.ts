import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, serverError, notFound } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const auth = requireAdmin(_request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const asset = await prisma.companyAsset.findUnique({ where: { id } });
    if (!asset) return notFound("Asset not found");

    await prisma.companyAsset.update({ where: { id }, data: { isActive: false } });
    await logActivity({
      userId: auth.id,
      action: "delete",
      entity: "asset",
      entityId: id,
      details: `Removed asset ${asset.name}`,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError("Failed to remove asset");
  }
}
