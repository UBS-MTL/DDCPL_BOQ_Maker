import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { requireAuth, serverError, badRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const LIMITS: Record<string, { exts: string[]; maxBytes: number }> = {
  logo: {
    exts: ["png", "jpg", "jpeg", "webp", "svg", "gif"],
    maxBytes: 2 * 1024 * 1024,
  },
  signature: {
    exts: ["png", "jpg", "jpeg", "webp", "svg"],
    maxBytes: 1 * 1024 * 1024,
  },
  bank_qr: {
    exts: ["png", "jpg", "jpeg", "webp"],
    maxBytes: 1 * 1024 * 1024,
  },
  certificate: {
    exts: ["png", "jpg", "jpeg", "webp", "pdf"],
    maxBytes: 10 * 1024 * 1024,
  },
  iso_badge: {
    exts: ["png", "jpg", "jpeg", "webp"],
    maxBytes: 1 * 1024 * 1024,
  },
  member_badge: {
    exts: ["png", "jpg", "jpeg", "webp"],
    maxBytes: 1 * 1024 * 1024,
  },
  product: {
    exts: ["png", "jpg", "jpeg", "webp"],
    maxBytes: 2 * 1024 * 1024,
  },
};

const BADGE_TYPES = new Set(["iso_badge", "member_badge"]);

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
  pdf: "application/pdf",
};

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const form = await request.formData();
    const file = form.get("file");
    const type = String(form.get("type") || "certificate");

    if (!(file instanceof File)) {
      return badRequest("No file provided");
    }

    const limits = LIMITS[type];
    if (!limits) {
      return badRequest("Invalid upload type");
    }

    const original = file.name || "file";
    const ext = (original.split(".").pop() || "").toLowerCase();
    if (!limits.exts.includes(ext)) {
      return badRequest(`File type not allowed. Allowed: ${limits.exts.join(", ")}`);
    }
    if (file.size > limits.maxBytes) {
      const mb = Math.round(limits.maxBytes / (1024 * 1024));
      return badRequest(`File too large (max ${mb}MB)`);
    }

    const safeName = `${type}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, safeName), bytes);

    const publicPath = `/api/files/${safeName}`;
    let assetId: string | null = null;

    if (type === "certificate") {
      const asset = await prisma.companyAsset.create({
        data: {
          type: "certificate",
          name: original.replace(/\.[^.]+$/, "").slice(0, 200) || "Certificate",
          path: publicPath,
        },
      });
      assetId = asset.id;
    } else if (BADGE_TYPES.has(type)) {
      const label = type === "iso_badge" ? "ISO Badge" : "Member Badge";
      const existing = await prisma.companyAsset.findFirst({
        where: { type, isActive: true },
      });
      if (existing) {
        await prisma.companyAsset.update({
          where: { id: existing.id },
          data: { path: publicPath, name: original.replace(/\.[^.]+$/, "").slice(0, 200) || label },
        });
        assetId = existing.id;
      } else {
        const asset = await prisma.companyAsset.create({
          data: { type, name: label, path: publicPath },
        });
        assetId = asset.id;
      }
    }

    await logActivity({
      userId: auth.id,
      action: "upload",
      entity: type === "certificate" || BADGE_TYPES.has(type) ? "asset" : "settings",
      entityId: assetId || safeName,
      details: `Uploaded ${original} as ${type}`,
    });

    return NextResponse.json({ path: publicPath, name: original, assetId }, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError("Upload failed");
  }
}
