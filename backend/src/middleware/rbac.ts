import { NextFunction, Request, Response } from "express";
import { AdminRole } from "@prisma/client";
import { ApiError } from "../utils/ApiError";

// Permissions are enforced HERE, in the backend, per the spec's explicit
// requirement — the frontend hiding a button is UX only, never security.
//
// Permission matrix (deliberately explicit rather than clever, so it's easy
// to audit and extend):
const PERMISSIONS: Record<string, AdminRole[]> = {
  "products:write": ["OWNER", "ADMIN", "PRODUCT_MANAGER"],
  "categories:write": ["OWNER", "ADMIN", "PRODUCT_MANAGER"],
  "brands:write": ["OWNER", "ADMIN", "PRODUCT_MANAGER"],
  "inventory:write": ["OWNER", "ADMIN", "PRODUCT_MANAGER"],
  "orders:read": ["OWNER", "ADMIN", "ORDER_MANAGER", "DELIVERY_MANAGER"],
  "orders:manage-payment": ["OWNER", "ADMIN", "ORDER_MANAGER"],
  // Only order/delivery managers can move an order along the shipping leg;
  // this resolves the ORDER_MANAGER vs DELIVERY_MANAGER overlap called out
  // during spec review by scoping DELIVERY_MANAGER to shipping transitions
  // only (PROCESSING -> SHIPPED -> DELIVERED), not payment/refund states.
  "orders:manage-shipping": ["OWNER", "ADMIN", "ORDER_MANAGER", "DELIVERY_MANAGER"],
  "coupons:write": ["OWNER", "ADMIN", "ORDER_MANAGER"],
  "shipping-rates:write": ["OWNER", "ADMIN"],
  "admins:manage": ["OWNER"],
  "admins:manage-non-owner": ["OWNER", "ADMIN"], // ADMIN can manage everyone except OWNER accounts
  "audit:read": ["OWNER", "ADMIN"],
  "dashboard:read": ["OWNER", "ADMIN", "PRODUCT_MANAGER", "ORDER_MANAGER", "DELIVERY_MANAGER"],
};

export function requirePermission(permission: keyof typeof PERMISSIONS) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) return next(ApiError.unauthorized());
    const allowed = PERMISSIONS[permission] ?? [];
    if (!allowed.includes(req.admin.role)) {
      return next(ApiError.forbidden("لا تملك صلاحية القيام بهذا الإجراء"));
    }
    next();
  };
}

export function requireRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) return next(ApiError.unauthorized());
    if (!roles.includes(req.admin.role)) return next(ApiError.forbidden());
    next();
  };
}
