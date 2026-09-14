import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { ApiError } from "../../utils/ApiError";

const router = Router();

router.get("/product/:productId", asyncHandler(async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { productId: req.params.productId, isApproved: true },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: reviews });
}));

const createReviewSchema = z.object({
  body: z.object({ productId: z.string().uuid(), rating: z.number().int().min(1).max(5), comment: z.string().max(2000).optional() }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.post("/", requireAuth, validate(createReviewSchema), asyncHandler(async (req, res) => {
  const { productId, rating, comment } = req.body;

  // Enforced here per spec: only a user who purchased AND received
  // (DELIVERED) the product may review it. We find one eligible OrderItem
  // that isn't already linked to a review (checked as a second step since
  // Review.orderItemId is a plain unique field, not a Prisma relation).
  const candidateItems = await prisma.orderItem.findMany({
    where: { productId, order: { userId: req.user!.id, status: "DELIVERED" } },
    select: { id: true },
  });
  if (candidateItems.length === 0) {
    throw ApiError.forbidden("يمكنك تقييم المنتج فقط بعد استلام طلب يحتويه");
  }
  const reviewedIds = new Set(
    (await prisma.review.findMany({ where: { orderItemId: { in: candidateItems.map((i) => i.id) } }, select: { orderItemId: true } })).map(
      (r) => r.orderItemId
    )
  );
  const eligibleItem = candidateItems.find((i) => !reviewedIds.has(i.id));
  if (!eligibleItem) {
    throw ApiError.forbidden("لقد قمت بتقييم هذا المنتج مسبقاً لكل عملية شراء");
  }

  const review = await prisma.review.upsert({
    where: { userId_productId: { userId: req.user!.id, productId } },
    update: { rating, comment, orderItemId: eligibleItem.id },
    create: { userId: req.user!.id, productId, rating, comment, orderItemId: eligibleItem.id },
  });
  res.status(201).json({ data: review });
}));

export default router;
