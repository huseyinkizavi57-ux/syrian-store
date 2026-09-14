import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAdmin } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { writeAuditLog } from "../../utils/audit";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const rates = await prisma.shippingRate.findMany({ where: { isActive: true }, orderBy: { governorate: "asc" } });
  res.json({ data: rates });
}));

const upsertSchema = z.object({
  body: z.object({ governorate: z.string().min(2), fee: z.number().min(0) }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.put(
  "/",
  requireAdmin,
  requirePermission("shipping-rates:write"),
  validate(upsertSchema),
  asyncHandler(async (req, res) => {
    const rate = await prisma.shippingRate.upsert({
      where: { governorate: req.body.governorate },
      update: { fee: req.body.fee, isActive: true },
      create: { governorate: req.body.governorate, fee: req.body.fee },
    });
    await writeAuditLog({ adminId: req.admin!.id, action: "UPDATE", entityType: "ShippingRate", entityId: rate.id, description: `تم تحديث أجرة الشحن لمحافظة ${rate.governorate} إلى ${rate.fee}` });
    res.json({ data: rate });
  })
);

export default router;
