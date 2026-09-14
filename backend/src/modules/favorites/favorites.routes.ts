import { Router } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.user!.id },
    include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: favorites });
}));

router.post("/:productId", asyncHandler(async (req, res) => {
  const favorite = await prisma.favorite.upsert({
    where: { userId_productId: { userId: req.user!.id, productId: req.params.productId } },
    update: {},
    create: { userId: req.user!.id, productId: req.params.productId },
  });
  res.status(201).json({ data: favorite });
}));

router.delete("/:productId", asyncHandler(async (req, res) => {
  await prisma.favorite.deleteMany({ where: { userId: req.user!.id, productId: req.params.productId } });
  res.status(204).send();
}));

export default router;
