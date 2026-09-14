import { Router } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { writeAuditLog } from "../../utils/audit";
import { ApiError } from "../../utils/ApiError";
import * as service from "./orders.service";
import { createOrderSchema, updateOrderStatusSchema } from "./orders.schema";

const router = Router();

// ---- Customer routes ----
router.post("/", requireAuth, validate(createOrderSchema), asyncHandler(async (req, res) => {
  const order = await service.createOrder(req.user!.id, req.body.addressId, req.body.couponCode);
  res.status(201).json({ data: order });
}));

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const orders = await service.listOrdersForUser(req.user!.id);
  res.json({ data: orders });
}));

router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const order = await service.getOrderForUser(req.params.id, req.user!.id);
  res.json({ data: order });
}));

router.post("/:id/cancel", requireAuth, asyncHandler(async (req, res) => {
  const order = await service.cancelOrderByUser(req.params.id, req.user!.id);
  res.json({ data: order });
}));

// ---- Admin routes ----
router.get("/admin/all", requireAdmin, requirePermission("orders:read"), asyncHandler(async (req, res) => {
  const status = req.query.status as string | undefined;
  const orders = await prisma.order.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { firstName: true, lastName: true, phone: true } }, items: true },
    take: 200,
  });
  res.json({ data: orders });
}));

router.get("/admin/:id", requireAdmin, requirePermission("orders:read"), asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true, address: true, payments: true, statusHistory: { orderBy: { createdAt: "asc" } }, user: true },
  });
  if (!order) throw ApiError.notFound("الطلب غير موجود");
  res.json({ data: order });
}));

router.post(
  "/admin/:id/status",
  requireAdmin,
  requirePermission("orders:manage-shipping"),
  validate(updateOrderStatusSchema),
  asyncHandler(async (req, res) => {
    // Extra guard: only ORDER_MANAGER (or above) may cancel/refund a paid
    // order — DELIVERY_MANAGER is limited to the shipping leg. Checked here
    // (not just in the route-level permission) because the permission
    // gate above is intentionally coarse; see rbac.ts comment.
    if (["CANCELLED"].includes(req.body.status) && req.admin!.role === "DELIVERY_MANAGER") {
      throw ApiError.forbidden("لا تملك صلاحية إلغاء الطلبات");
    }
    const order = await service.adminUpdateOrderStatus(req.params.id, req.body.status, req.admin!.id, req.body.note);
    await writeAuditLog({
      adminId: req.admin!.id,
      action: "STATUS_CHANGE",
      entityType: "Order",
      entityId: order.id,
      description: `تغيرت حالة الطلب ${order.orderNumber} إلى ${order.status}`,
    });
    res.json({ data: order });
  })
);

export default router;
