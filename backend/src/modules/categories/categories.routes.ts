import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { requireAdmin } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { writeAuditLog } from "../../utils/audit";
import { ApiError } from "../../utils/ApiError";

const router = Router();

const categoryBody = z.object({
  body: z.object({
    name: z.string().min(2),
    nameAr: z.string().min(2),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
    parentId: z.string().uuid().optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    sortOrder: z.number().int().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.get("/", asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  res.json({ data: categories });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const category = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!category) throw ApiError.notFound("القسم غير موجود");
  res.json({ data: category });
}));

router.post(
  "/",
  requireAdmin,
  requirePermission("categories:write"),
  validate(categoryBody),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.create({ data: req.body });
    await writeAuditLog({
      adminId: req.admin!.id,
      action: "CREATE",
      entityType: "Category",
      entityId: category.id,
      description: `تم إنشاء قسم: ${category.nameAr}`,
    });
    res.status(201).json({ data: category });
  })
);

router.patch(
  "/:id",
  requireAdmin,
  requirePermission("categories:write"),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.update({ where: { id: req.params.id }, data: req.body });
    await writeAuditLog({
      adminId: req.admin!.id,
      action: "UPDATE",
      entityType: "Category",
      entityId: category.id,
      description: `تم تعديل قسم: ${category.nameAr}`,
      metadata: { changes: req.body },
    });
    res.json({ data: category });
  })
);

router.delete(
  "/:id",
  requireAdmin,
  requirePermission("categories:write"),
  asyncHandler(async (req, res) => {
    // Soft delete: categories may have products referencing them historically.
    const category = await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } });
    await writeAuditLog({
      adminId: req.admin!.id,
      action: "DELETE",
      entityType: "Category",
      entityId: category.id,
      description: `تم إلغاء تفعيل قسم: ${category.nameAr}`,
    });
    res.status(204).send();
  })
);

export default router;
