import { Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "../../utils/ApiError";

type TxClient = Prisma.TransactionClient | PrismaClient;

// Validates a coupon and returns the discount amount for a given subtotal.
// Must be called from WITHIN the order-creation transaction so the
// usage-limit check and the eventual CouponRedemption insert are atomic —
// otherwise two concurrent checkouts could both "pass" a usageLimitTotal: 1
// coupon.
export async function validateAndPriceCoupon(
  tx: TxClient,
  code: string,
  userId: string,
  subtotal: number
): Promise<{ couponId: string; discount: number }> {
  const coupon = await tx.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) throw ApiError.badRequest("كوبون غير صالح");

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) throw ApiError.badRequest("الكوبون لم يفعّل بعد");
  if (coupon.expiresAt && coupon.expiresAt < now) throw ApiError.badRequest("انتهت صلاحية الكوبون");

  if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
    throw ApiError.badRequest(`الحد الأدنى للطلب لاستخدام هذا الكوبون هو ${coupon.minOrderAmount}`);
  }

  if (coupon.usageLimitTotal !== null && coupon.timesUsed >= (coupon.usageLimitTotal ?? 0)) {
    throw ApiError.badRequest("تم استنفاد عدد مرات استخدام هذا الكوبون");
  }

  if (coupon.usageLimitPerUser !== null) {
    const userUsageCount = await tx.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    if (userUsageCount >= (coupon.usageLimitPerUser ?? 0)) {
      throw ApiError.badRequest("لقد استخدمت هذا الكوبون بالحد الأقصى المسموح");
    }
  }

  const discount =
    coupon.type === "PERCENTAGE"
      ? Math.round(((subtotal * (coupon.percentageValue ?? 0)) / 100) * 100) / 100
      : Number(coupon.fixedValue ?? 0);

  return { couponId: coupon.id, discount: Math.min(discount, subtotal) };
}

export async function recordCouponRedemption(tx: TxClient, couponId: string, userId: string, orderId: string) {
  await tx.couponRedemption.create({ data: { couponId, userId, orderId } });
  await tx.coupon.update({ where: { id: couponId }, data: { timesUsed: { increment: 1 } } });
}