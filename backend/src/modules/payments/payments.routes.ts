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
  body: z.object({ orderId: z.string().uuid() }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

// Customer initiates a payment for their own PENDING_PAYMENT order. Note:
// no `amount` field accepted here at all — see payments.service.ts.
router.post("/initiate", requireAuth, paymentLimiter, validate(initiateSchema), asyncHandler(async (req, res) => {
  const payment = await service.initiatePayment(req.body.orderId, req.user!.id);
  res.status(201).json({ data: payment });
}));

// Manual "check status" — useful when no webhook is available (polling
// fallback), and safe to call repeatedly (reconcile is idempotent).
router.post("/:id/check", requireAuth, asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!payment) throw ApiError.notFound("عملية الدفع غير موجودة");
  const order = await prisma.order.findFirst({ where: { id: payment.orderId, userId: req.user!.id } });
  if (!order) throw ApiError.forbidden();
  const updated = await service.reconcilePaymentWithProvider(payment.id);
  res.json({ data: updated });
}));

// Real Sham Cash webhook target — currently a placeholder. Once official
// docs exist this must verify the request signature (HMAC or similar)
// BEFORE calling handleProviderWebhook, using SHAM_CASH_SECRET. Do not wire
// this up to accept unauthenticated calls in production; it is intentionally
// not mounted with any auth middleware right now because we don't yet know
// Sham Cash's real auth scheme for webhooks (spec: "لا تخترع authentication
// scheme").
router.post("/shamcash/webhook", asyncHandler(async (req, res) => {
  throw ApiError.internal("Webhook Sham Cash غير مفعّل — بانتظار التوثيق الرسمي والتحقق من التوقيع");
}));

// Admin: view payments for an order.
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
