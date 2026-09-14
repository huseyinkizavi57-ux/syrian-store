import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAdmin } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { writeAuditLog } from "../../utils/audit";
import { hashPassword } from "../../utils/password";
import { ApiError } from "../../utils/ApiError";

const router = Router();

// ---- Dashboard ----
router.get("/dashboard", requireAdmin, requirePermission("dashboard:read"), asyncHandler(async (req, res) => {
  const [userCount, productCount, orderCount, newOrders, lowStock, revenueAgg, paymentsAgg] = await Promise.all([
    prisma.user.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    prisma.productVariant.count({ where: { stock: { lte: 5, gt: 0 } } }),
    prisma.order.aggregate({ where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } }, _sum: { total: true } }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: true }),
  ]);

  res.json({
    data: {
      userCount,
      productCount,
      orderCount,
      newOrders,
      lowStockVariants: lowStock,
      totalRevenue: revenueAgg._sum.total ?? 0,
      totalPayments: paymentsAgg._sum.amount ?? 0,
      paymentCount: paymentsAgg._count,
    },
  });
}));

// ---- Admin user management ----
const createAdminSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["OWNER", "ADMIN", "PRODUCT_MANAGER", "ORDER_MANAGER", "DELIVERY_MANAGER"]),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.get("/admins", requireAdmin, requirePermission("admins:manage-non-owner"), asyncHandler(async (req, res) => {
  const admins = await prisma.adminUser.findMany({
    select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ data: admins });
}));

router.post(
  "/admins",
  requireAdmin,
  requirePermission("admins:manage-non-owner"),
  validate(createAdminSchema),
  asyncHandler(async (req, res) => {
    // Only OWNER may create another OWNER account.
    if (req.body.role === "OWNER" && req.admin!.role !== "OWNER") {
      throw ApiError.forbidden("فقط المالك (Owner) يستطيع إنشاء حساب Owner آخر");
    }
    const passwordHash = await hashPassword(req.body.password);
    const admin = await prisma.adminUser.create({
      data: { fullName: req.body.fullName, email: req.body.email, passwordHash, role: req.body.role },
    });
    await writeAuditLog({
      adminId: req.admin!.id,
      action: "CREATE",
      entityType: "AdminUser",
      entityId: admin.id,
      description: `تم إنشاء حساب مدير: ${admin.fullName} (${admin.role})`,
    });
    res.status(201).json({ data: { id: admin.id, fullName: admin.fullName, email: admin.email, role: admin.role } });
  })
);

const updateAdminSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).optional(),
    role: z.enum(["OWNER", "ADMIN", "PRODUCT_MANAGER", "ORDER_MANAGER", "DELIVERY_MANAGER"]).optional(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.patch(
  "/admins/:id",
  requireAdmin,
  requirePermission("admins:manage-non-owner"),
  validate(updateAdminSchema),
  asyncHandler(async (req, res) => {
    const target = await prisma.adminUser.findUnique({ where: { id: req.params.id } });
    if (!target) throw ApiError.notFound("الحساب غير موجود");

    // ADMIN role can manage everyone EXCEPT OWNER accounts (spec section 17).
    if (target.role === "OWNER" && req.admin!.role !== "OWNER") {
      throw ApiError.forbidden("لا تملك صلاحية تعديل حساب Owner");
    }
    // Prevent promoting to OWNER unless the actor is already an OWNER.
    if (req.body.role === "OWNER" && req.admin!.role !== "OWNER") {
      throw ApiError.forbidden("فقط Owner يستطيع منح صلاحية Owner");
    }

    // Guard against deactivating/demoting the LAST active OWNER — a gap
    // flagged during spec review (the system must never end up with zero
    // active owners).
    const wouldRemoveOwnerStatus =
      target.role === "OWNER" &&
      ((req.body.role && req.body.role !== "OWNER") || req.body.isActive === false);
    if (wouldRemoveOwnerStatus) {
      const activeOwners = await prisma.adminUser.count({ where: { role: "OWNER", isActive: true } });
      if (activeOwners <= 1) {
        throw ApiError.badRequest("لا يمكن إزالة آخر حساب Owner نشط في النظام");
      }
    }

    const updated = await prisma.adminUser.update({ where: { id: target.id }, data: req.body });
    await writeAuditLog({
      adminId: req.admin!.id,
      action: req.body.role ? "ROLE_CHANGE" : "UPDATE",
      entityType: "AdminUser",
      entityId: updated.id,
      description: `تم تعديل حساب مدير: ${updated.fullName}`,
      metadata: { changes: req.body },
    });
    res.json({ data: { id: updated.id, fullName: updated.fullName, role: updated.role, isActive: updated.isActive } });
  })
);

// ---- Audit log ----
router.get("/audit-logs", requireAdmin, requirePermission("audit:read"), asyncHandler(async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { admin: { select: { fullName: true, role: true } } },
  });
  res.json({ data: logs });
}));

export default router;
