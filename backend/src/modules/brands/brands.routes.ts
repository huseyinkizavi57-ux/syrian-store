import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAdmin } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { writeAuditLog } from "../../utils/audit";
import { ApiError } from "../../utils/ApiError";

const router = Router();

const brandBody = z.object({
  body: z.object({
    name: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    logoUrl: z.string().url().optional().nullable(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.get("/", asyncHandler(async (req, res) => {
  const brands = await prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  res.json({ data: brands });
}));

router.post(
  "/",
  requireAdmin,
  requirePermission("brands:write"),
  validate(brandBody),
  asyncHandler(async (req, res) => {
    const brand = await prisma.brand.create({ data: req.body });
    await writeAuditLog({ adminId: req.admin!.id, action: "CREATE", entityType: "Brand", entityId: brand.id, description: `تم إنشاء علامة تجارية: ${brand.name}` });
    res.status(201).json({ data: brand });
  })
);

router.patch(
  "/:id",
  requireAdmin,
  requirePermission("brands:write"),
  asyncHandler(async (req, res) => {
    const brand = await prisma.brand.update({ where: { id: req.params.id }, data: req.body });
    await writeAuditLog({ adminId: req.admin!.id, action: "UPDATE", entityType: "Brand", entityId: brand.id, description: `تم تعديل علامة تجارية: ${brand.name}`, metadata: { changes: req.body } });
    res.json({ data: brand });
  })
);

router.delete(
  "/:id",
  requireAdmin,
  requirePermission("brands:write"),
  asyncHandler(async (req, res) => {
    const brand = await prisma.brand.update({ where: { id: req.params.id }, data: { isActive: false } });
    await writeAuditLog({ adminId: req.admin!.id, action: "DELETE", entityType: "Brand", entityId: brand.id, description: `تم إلغاء تفعيل علامة تجارية: ${brand.name}` });
    res.status(204).send();
  })
);

export default router;
