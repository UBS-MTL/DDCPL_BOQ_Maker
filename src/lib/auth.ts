import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export type JwtUser = { id: string; email: string; role: string };

const DEV_FALLBACK_SECRET = "dev-only-insecure-secret-change-me";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return DEV_FALLBACK_SECRET;
  throw new Error("JWT_SECRET environment variable is required in production");
}

export function signToken(user: JwtUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

export function verifyToken(request: Request): JwtUser | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(auth.slice(7), getJwtSecret());
    if (typeof payload === "string") return null;
    const { id, email, role } = payload as jwt.JwtPayload & JwtUser;
    if (!id || !email || !role) return null;
    return { id, email, role };
  } catch {
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function requireAuth(request: Request): JwtUser | NextResponse {
  const user = verifyToken(request);
  return user ?? unauthorized();
}

export function requireAdmin(request: Request): JwtUser | NextResponse {
  const user = verifyToken(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden("Admin access required");
  return user;
}

export function isAdmin(user: JwtUser): boolean {
  return user.role === "admin";
}

export function authErrorResponse(error: unknown) {
  if (error instanceof NextResponse) return error;
  return serverError();
}
