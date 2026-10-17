import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { notFound } from "@/lib/auth";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
  pdf: "application/pdf",
};

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, { params }: Params) {
  const { path: parts } = await params;
  const rel = parts.join("/");
  if (!rel || rel.includes("..") || rel.includes("\\")) return notFound("Not found");

  const filePath = path.join(UPLOAD_DIR, rel);
  if (!filePath.startsWith(UPLOAD_DIR)) return notFound("Not found");

  try {
    const data = await fs.readFile(filePath);
    const ext = (rel.split(".").pop() || "").toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return notFound("Not found");
  }
}
