import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/tokens";
import { AdminRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; type: "user" };
      admin?: { id: string; role: AdminRole };
    }
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

// Requires a logged-in CUSTOMER. Does not accept admin tokens.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) return next(ApiError.unauthorized("يجب تسجيل الدخول"));
  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== "user") return next(ApiError.unauthorized());
    req.user = { id: payload.sub, type: "user" };
    next();
  } catch {
    return next(ApiError.unauthorized("جلسة غير صالحة أو منتهية"));
  }
}

// Optional auth: attaches req.user if a valid token is present, but does not
// reject the request otherwise (used for e.g. product pages that behave
// slightly differently for logged-in users without requiring login).
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    if (payload.type === "user") req.user = { id: payload.sub, type: "user" };
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}

// Requires a logged-in ADMIN (any role). Role-specific checks are layered on
// top via requireRole().
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) return next(ApiError.unauthorized("يجب تسجيل دخول المدير"));
  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== "admin" || !payload.role) return next(ApiError.unauthorized());
    req.admin = { id: payload.sub, role: payload.role as AdminRole };
    next();
  } catch {
    return next(ApiError.unauthorized("جلسة غير صالحة أو منتهية"));
  }
}
