import { OrderStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { generateOrderNumber } from "../../utils/orderNumber";
import { env } from "../../config/env";
import { validateAndPriceCoupon, recordCouponRedemption } from "../coupons/coupons.service";

// ---------------------------------------------------------------------------
// Order creation — the most safety-critical path in the app.
// ---------------------------------------------------------------------------
export async function createOrder(userId: string, addressId: string, couponCode?: string) {
  return prisma.$transaction(async (tx) => {
    const address = await tx.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw ApiError.badRequest("عنوان الشحن غير صالح");

    const cart = await tx.cart.findUnique({
      where: { userId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });
    if (!cart || cart.items.length === 0) throw ApiError.badRequest("السلة فارغة");

    let subtotal = 0;
    const itemsData: {
      productId: string;
      variantId: string;
      nameSnapshot: string;
      skuSnapshot: string;
      colorSnapshot: string | null;
      sizeSnapshot: string | null;
      priceSnapshot: number;
      quantity: number;
    }[] = [];

    for (const item of cart.items) {
      if (item.variant.product.status !== "ACTIVE") {
        throw ApiError.badRequest(`المنتج "${item.variant.product.name}" لم يعد متوفراً`);
      }

      const result = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity }, version: { increment: 1 } },
      });
      if (result.count === 0) {
        throw ApiError.conflict(
          `الكمية المطلوبة من "${item.variant.product.name}" غير متوفرة في المخزون حالياً`
        );
      }

      const lineTotal = Number(item.variant.price) * item.quantity;
      subtotal += lineTotal;
      itemsData.push({
        productId: item.variant.productId,
        variantId: item.variantId,
        nameSnapshot: item.variant.product.name,
        skuSnapshot: item.variant.sku,
        colorSnapshot: item.variant.color,
        sizeSnapshot: item.variant.size,
        priceSnapshot: Number(item.variant.price),
        quantity: item.quantity,
      });
    }

    const shippingRate = await tx.shippingRate.findUnique({ where: { governorate: address.governorate } });
    const shippingFee = shippingRate && shippingRate.isActive ? Number(shippingRate.fee) : 0;

    let discountTotal = 0;
    let couponId: string | null = null;
    if (couponCode) {
      const priced = await validateAndPriceCoupon(tx, couponCode, userId, subtotal);
      couponId = priced.couponId;
      discountTotal = priced.discount;
    }

    const total = Math.max(subtotal - discountTotal + shippingFee, 0);
    const expiresAt = new Date(Date.now() + env.order.pendingPaymentTtlMinutes * 60 * 1000);

    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        addressId,
        status: "PENDING_PAYMENT",
        subtotal,
        discountTotal,
        shippingFee,
        total,
        couponId,
        expiresAt,
        items: { create: itemsData },
        statusHistory: { create: { status: "PENDING_PAYMENT", note: "تم إنشاء الطلب" } },
      },
      include: { items: true },
    });

    if (couponId) await recordCouponRedemption(tx, couponId, userId, order.id);

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  });
}

export async function getOrderForUser(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true, address: true, payments: true, statusHistory: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) throw ApiError.notFound("الطلب غير موجود");
  return order;
}

export async function listOrdersForUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
}

export async function cancelOrderByUser(orderId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, userId }, include: { items: true } });
    if (!order) throw ApiError.notFound("الطلب غير موجود");
    if (!["PENDING_PAYMENT", "PAID", "PROCESSING"].includes(order.status)) {
      throw ApiError.badRequest("لا يمكن إلغاء الطلب في هذه المرحلة");
    }
    for (const item of order.items) {
      await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
    }
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        cancelledReason: "ألغاه المستخدم",
        statusHistory: { create: { status: "CANCELLED", note: "ألغاه المستخدم" } },
      },
    });
    return updated;
  });
}

// Admin-side status transitions:
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"], // تم السماح بالانتقال إلى PAID يدوياً للاختبار
  PAID: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export async function adminUpdateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  adminId: string,
  note?: string
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw ApiError.notFound("الطلب غير موجود");

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw ApiError.badRequest(`لا يمكن الانتقال من ${order.status} إلى ${nextStatus}`);
    }

    if (nextStatus === "CANCELLED" && order.status !== "PENDING_PAYMENT") {
      for (const item of order.items) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      }
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        statusHistory: { create: { status: nextStatus, note, changedBy: adminId } },
      },
    });
    return updated;
  });
}

export async function expireStalePendingOrders() {
  const now = new Date();
  const stale = await prisma.order.findMany({
    where: { status: "PENDING_PAYMENT", expiresAt: { lt: now } },
    include: { items: true },
  });

  for (const order of stale) {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.order.findUnique({ where: { id: order.id } });
      if (!fresh || fresh.status !== "PENDING_PAYMENT") return;

      for (const item of order.items) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          cancelledReason: "انتهت مهلة الدفع",
          statusHistory: { create: { status: "CANCELLED", note: "انتهت مهلة الدفع تلقائياً" } },
        },
      });
    });
  }

  return stale.length;
}