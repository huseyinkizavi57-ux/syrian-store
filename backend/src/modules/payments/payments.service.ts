import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { getPaymentProvider, RequestedPaymentMethod } from "./providers";
import { generateIdempotencyKey } from "../../utils/idempotency";

export async function initiatePayment(
  orderId: string,
  userId: string,
  method: RequestedPaymentMethod = "SHAM_CASH"
) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw ApiError.notFound("الطلب غير موجود");
  if (order.status !== "PENDING_PAYMENT") {
    throw ApiError.badRequest("هذا الطلب ليس بانتظار الدفع");
  }
  if (order.expiresAt && order.expiresAt < new Date()) {
    throw ApiError.badRequest("انتهت مهلة الدفع لهذا الطلب، الرجاء إنشاء طلب جديد");
  }

  const existing = await prisma.payment.findFirst({
    where: { orderId, status: { in: ["PENDING", "PAID"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const provider = getPaymentProvider(method);
  const idempotencyKey = generateIdempotencyKey(orderId, userId);
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

    if (provider.name === "CASH_ON_DELIVERY") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PENDING_CONFIRMATION",
          expiresAt: null,
          statusHistory: {
            create: {
              status: "PENDING_CONFIRMATION",
              note: "تم اختيار الدفع عند الاستلام — بانتظار تأكيد الطلب",
            },
          },
        },
      });
      return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    }

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

export async function reconcilePaymentWithProvider(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || !payment.providerReference) return payment;
  if (payment.status === "PAID") return payment;
  if (payment.provider === "CASH_ON_DELIVERY") return payment;

  const provider = getPaymentProvider("SHAM_CASH");
  const verification = await provider.verify({ providerReference: payment.providerReference });

  if (verification.status === "PAID") {
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
    return prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", rawResponse: verification.raw as any },
    });
  }

  return payment;
}

async function markPaymentPaid(paymentId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw ApiError.notFound("الدفعة غير موجودة");
    if (payment.status === "PAID") return payment;

    const updatedPayment = await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID" } });

    const order = await tx.order.findUnique({ where: { id: payment.orderId } });
    if (order && order.status === "PENDING_PAYMENT") {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          expiresAt: null,
          statusHistory: { create: { status: "PAID", note: "تم تأكيد الدفع" } },
        },
      });
    }
    return updatedPayment;
  });
}

export async function handleProviderWebhook(providerReference: string) {
  const payment = await prisma.payment.findUnique({ where: { providerReference } });
  if (!payment) throw ApiError.notFound("عملية الدفع غير معروفة");
  return reconcilePaymentWithProvider(payment.id);
}