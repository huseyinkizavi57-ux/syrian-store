import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { ApiError } from "../../utils/ApiError";

const router = Router();
router.use(requireAuth);

async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) cart = await prisma.cart.create({ data: { userId } });
  return cart;
}

function serializeCart(cart: Awaited<ReturnType<typeof loadFullCart>>) {
  const items = cart!.items.map((item) => ({
    id: item.id,
    variantId: item.variantId,
    quantity: item.quantity,
    product: {
      id: item.variant.product.id,
      name: item.variant.product.name,
      slug: item.variant.product.slug,
      image: item.variant.product.images[0]?.url ?? null,
    },
    variant: {
      color: item.variant.color,
      size: item.variant.size,
      price: item.variant.price,
      stock: item.variant.stock,
    },
    lineTotal: Number(item.variant.price) * item.quantity,
  }));
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  return { id: cart!.id, items, subtotal };
}

async function loadFullCart(cartId: string) {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: { variant: { include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } } } },
      },
    },
  });
}

router.get("/", asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user!.id);
  const full = await loadFullCart(cart.id);
  res.json({ data: serializeCart(full) });
}));

const addItemSchema = z.object({
  body: z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(50) }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.post("/items", validate(addItemSchema), asyncHandler(async (req, res) => {
  const { variantId, quantity } = req.body;
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw ApiError.notFound("الخيار غير موجود");
  // Note: we don't hard-cap against stock here (stock is checked/held only
  // at order-creation time to avoid needless friction while browsing/
  // building a cart) — see orders.service.ts for the authoritative check.
  const cart = await getOrCreateCart(req.user!.id);
  const item = await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { quantity: { increment: quantity } },
    create: { cartId: cart.id, variantId, quantity },
  });
  const full = await loadFullCart(cart.id);
  res.status(201).json({ data: serializeCart(full) });
}));

const updateItemSchema = z.object({
  body: z.object({ quantity: z.number().int().min(1).max(50) }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.patch("/items/:itemId", validate(updateItemSchema), asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user!.id);
  const item = await prisma.cartItem.findFirst({ where: { id: req.params.itemId, cartId: cart.id } });
  if (!item) throw ApiError.notFound("العنصر غير موجود في السلة");
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: req.body.quantity } });
  const full = await loadFullCart(cart.id);
  res.json({ data: serializeCart(full) });
}));

router.delete("/items/:itemId", asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user!.id);
  await prisma.cartItem.deleteMany({ where: { id: req.params.itemId, cartId: cart.id } });
  const full = await loadFullCart(cart.id);
  res.json({ data: serializeCart(full) });
}));

export default router;
