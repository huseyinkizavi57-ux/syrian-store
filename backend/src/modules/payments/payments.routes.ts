import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { paymentLimiter } from "../../middleware/rateLimit";
import { ApiError } from "../../utils/ApiError";
import * as service from "./payments.service";

const router = Router();

const initiateSchema = z.object({
  body: z.object({
    orderId: z.string().uuid(),
    provider: z.enum(["SHAM_CASH", "CASH_ON_DELIVERY"]).optional().default("SHAM_CASH"),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.post("/initiate", requireAuth, paymentLimiter, validate(initiateSchema), asyncHandler(async (req, res) => {
  const payment = await service.initiatePayment(req.body.orderId, req.user!.id, req.body.provider);
  res.status(201).json({ data: payment });
}));

router.post("/:id/check", requireAuth, asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!payment) throw ApiError.notFound("عملية الدفع غير موجودة");
  const order = await prisma.order.findFirst({ where: { id: payment.orderId, userId: req.user!.id } });
  if (!order) throw ApiError.forbidden();
  const updated = await service.reconcilePaymentWithProvider(payment.id);
  res.json({ data: updated });
}));

router.post("/shamcash/webhook", asyncHandler(async (req, res) => {
  throw ApiError.internal("Webhook Sham Cash غير مفعّل — بانتظار التوثيق الرسمي والتحقق من التوقيع");
}));

router.get(
  "/admin/order/:orderId",
  requireAdmin,
  requirePermission("orders:manage-payment"),
  asyncHandler(async (req, res) => {
    const payments = await prisma.payment.findMany({ where: { orderId: req.params.orderId }, orderBy: { createdAt: "desc" } });
    res.json({ data: payments });
  })
);

export default router;