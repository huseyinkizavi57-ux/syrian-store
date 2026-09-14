import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { getPaymentProvider } from "./providers";
import { generateIdempotencyKey } from "../../utils/idempotency";

// ---------------------------------------------------------------------------
// Anti-tampering rules (spec section 13), enforced structurally here:
//  - `amount` is ALWAYS read from Order.total in the DB, never accepted from
//    the request body.
//  - `status` is ALWAYS derived from the provider's verify() response (or a
//    verified webhook payload), never accepted from the request body.
//  - `transactionId` / `providerReference` uniqueness is enforced at the DB
//    level (Payment.providerReference is @unique), so a replayed/reused
//    reference cannot be attached to a second Payment row.
//  - Idempotency: initiatePayment() reuses any existing non-FAILED Payment
//    for the order instead of creating a new one on repeated "pay now"
//    clicks. This is the resolution to the spec-review gap about where the
//    idempotency key comes from — it's generated and owned by the backend.
// ---------------------------------------------------------------------------

export async function initiatePayment(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw ApiError.notFound("الطلب غير موجود");
  if (order.status !== "PENDING_PAYMENT") {
    throw ApiError.badRequest("هذا الطلب ليس بانتظار الدفع");
  }
  if (order.expiresAt && order.expiresAt < new Date()) {
    throw ApiError.badRequest("انتهت مهلة الدفع لهذا الطلب، الرجاء إنشاء طلب جديد");
  }

  // Reuse an in-flight attempt if one exists (idempotency on repeated clicks).
  const existing = await prisma.payment.findFirst({
    where: { orderId, status: { in: ["PENDING", "PAID"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const provider = getPaymentProvider();
  const idempotencyKey = generateIdempotencyKey(orderId, userId);

  // amount comes ONLY from the server-computed Order.total.
  const amount = Number(order.total);

  const payment = await prisma.payment.create({
    data: {
      orderId,
      provider: provider.name,
      amount,
      currency: "SYP",
      status: "PENDING",
      idempotencyKey,
    },
  });

  try {
    const result = await provider.initiate({ orderId, amount, currency: "SYP", idempotencyKey });
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { providerReference: result.providerReference, rawResponse: result.raw as any },
    });
    // For MOCK, initiate() already settles instantly — reconcile immediately.
    await reconcilePaymentWithProvider(updated.id);
    return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  } catch (err) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: err instanceof Error ? err.message : "unknown" },
    });
    throw err;
  }
}

// Authoritative confirmation path: asks the PROVIDER (not the client)
// whether the payment succeeded, then updates Payment + Order accordingly.
// Called after initiate() and also exposed as a manual "check status"
// endpoint / webhook handler entry point.
export async function reconcilePaymentWithProvider(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || !payment.providerReference) return payment;
  if (payment.status === "PAID") return payment; // already settled, idempotent no-op

  const provider = getPaymentProvider();
  const verification = await provider.verify({ providerReference: payment.providerReference });

  if (verification.status === "PAID") {
    // Defense in depth: even though amount was server-set at initiate time,
    // cross-check the provider's reported amount before marking paid.
    if (Math.abs(verification.amount - Number(payment.amount)) > 0.01) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: "Amount mismatch with provider" },
      });
      throw ApiError.conflict("عدم تطابق في مبلغ الدفع، تم رفض العملية");
    }
    return markPaymentPaid(payment.id);
  }

  if (verification.status === "FAILED") {
    return prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", rawResponse: verification.raw as any } });
  }

  return payment; // still PENDING
}

async function markPaymentPaid(paymentId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw ApiError.notFound("الدفعة غير موجودة");
    if (payment.status === "PAID") return payment; // idempotent

    const updatedPayment = await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID" } });

    const order = await tx.order.findUnique({ where: { id: payment.orderId } });
    if (order && order.status === "PENDING_PAYMENT") {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          expiresAt: null, // paid orders are no longer subject to the pending-payment expiry job
          statusHistory: { create: { status: "PAID", note: "تم تأكيد الدفع" } },
        },
      });
    }
    return updatedPayment;
  });
}

// Entry point for a provider webhook, once real Sham Cash docs exist. Kept
// idempotent by re-using reconcilePaymentWithProvider's PAID short-circuit,
// so a retried/duplicated webhook delivery is always safe.
export async function handleProviderWebhook(providerReference: string) {
  const payment = await prisma.payment.findUnique({ where: { providerReference } });
  if (!payment) throw ApiError.notFound("عملية الدفع غير معروفة");
  return reconcilePaymentWithProvider(payment.id);
}
