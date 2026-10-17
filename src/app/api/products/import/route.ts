import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, badRequest } from "@/lib/auth";
import { importProductsSchema, parseOr400 } from "@/lib/validation";
import { logActivity } from "@/lib/activity";

export async function POST(request: Request) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseOr400(importProductsSchema, body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const rows = parsed.data.products;
  let created = 0;
  let updated = 0;

  try {
    for (const row of rows) {
      const categoryId = row.categoryId ? { categoryId: row.categoryId } : {};
      const existing = row.sku
        ? await prisma.product.findFirst({ where: { sku: row.sku } })
        : await prisma.product.findFirst({ where: { name: row.name } });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: row.name,
            description: row.description ?? undefined,
            sku: row.sku || null,
            brand: row.brand ?? undefined,
            modelNumber: row.modelNumber ?? undefined,
            specifications: row.specifications ?? undefined,
            subCategory: row.subCategory ?? undefined,
            costPrice: row.costPrice ?? undefined,
            unit: row.unit,
            rate: row.rate,
            gstRate: row.gstRate,
            hsnCode: row.hsnCode ?? undefined,
            isActive: row.isActive,
            ...categoryId,
          },
        });
        updated += 1;
      } else {
        await prisma.product.create({
          data: {
            name: row.name,
            description: row.description ?? null,
            sku: row.sku || null,
            brand: row.brand ?? null,
            modelNumber: row.modelNumber ?? null,
            specifications: row.specifications ?? null,
            subCategory: row.subCategory ?? null,
            costPrice: row.costPrice ?? null,
            unit: row.unit,
            rate: row.rate,
            gstRate: row.gstRate,
            hsnCode: row.hsnCode ?? null,
            isActive: row.isActive,
            ...categoryId,
          },
        });
        created += 1;
      }
    }

    await logActivity({
      userId: auth.id,
      action: "import",
      entity: "product",
      details: `Imported products (created: ${created}, updated: ${updated})`,
    });

    return NextResponse.json({ created, updated });
  } catch (error) {
    console.error(error);
    return badRequest("Import failed while saving products");
  }
}
