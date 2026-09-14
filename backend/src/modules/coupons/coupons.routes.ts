import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { writeAuditLog } from "../../utils/audit";
import { ApiError } from "../../utils/ApiError";

const router = Router();

const couponBody = z.object({
  body: z.object({
    code: z.string().min(3).max(30),
    type: z.enum(["PERCENTAGE", "FIXED"]),
    percentageValue: z.number().int().min(1).max(100).optional(),
    fixedValue: z.number().positive().optional(),
    minOrderAmount: z.number().positive().optional(),
    usageLimitTotal: z.number().int().positive().optional(),
    usageLimitPerUser: z.number().int().positive().optional(),
    startsAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.post(
  "/",
  requireAdmin,
  requirePermission("coupons:write"),
  validate(couponBody),
  asyncHandler(async (req, res) => {
    const coupon = await prisma.coupon.create({ data: req.body as any });
    await writeAuditLog({ adminId: req.admin!.id, action: "CREATE", entityType: "Coupon", entityId: coupon.id, description: `تم إنشاء كوبون: ${coupon.code}` });
    res.status(201).json({ data: coupon });
  })
);

router.get("/", requireAdmin, requirePermission("coupons:write"), asyncHandler(async (req, res) => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ data: coupons });
}));

router.patch("/:id", requireAdmin, requirePermission("coupons:write"), asyncHandler(async (req, res) => {
  const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data: req.body });
  await writeAuditLog({ adminId: req.admin!.id, action: "UPDATE", entityType: "Coupon", entityId: coupon.id, description: `تم تعديل كوبون: ${coupon.code}`, metadata: { changes: req.body } });
  res.json({ data: coupon });
}));

// Customers can check a coupon's validity/discount preview before checkout
// without actually redeeming it (redemption only happens transactionally
// inside order creation — see coupons.service.ts).
router.get("/validate/:code", requireAuth, asyncHandler(async (req, res) => {
  const coupon = await prisma.coupon.findUnique({ where: { code: req.params.code } });
  if (!coupon || !coupon.isActive) throw ApiError.badRequest("كوبون غير صالح");
  res.json({ data: { code: coupon.code, type: coupon.type, percentageValue: coupon.percentageValue, fixedValue: coupon.fixedValue, minOrderAmount: coupon.minOrderAmount } });
}));

export default router;
