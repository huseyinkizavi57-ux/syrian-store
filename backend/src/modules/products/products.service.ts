import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

export async function listProducts(query: {
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  minRating?: number;
  sort?: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(query.category ? { categoryId: query.category } : {}),
    ...(query.brand ? { brandId: query.brand } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.minPrice || query.maxPrice
      ? {
          price: {
            ...(query.minPrice ? { gte: query.minPrice } : {}),
            ...(query.maxPrice ? { lte: query.maxPrice } : {}),
          },
        }
      : {}),
    ...(query.inStock ? { variants: { some: { stock: { gt: 0 } } } } : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sort === "price_asc"
      ? { price: "asc" }
      : query.sort === "price_desc"
      ? { price: "desc" }
      : query.sort === "newest"
      ? { createdAt: "desc" }
      : { createdAt: "desc" };

  const skip = (query.page - 1) * query.pageSize;

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: query.pageSize,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        brand: true,
        category: true,
        variants: { select: { id: true, price: true, stock: true, color: true, size: true } },
        _count: { select: { reviews: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  let result = items;
  if (query.minRating || query.sort === "rating") {
    const ids = items.map((p) => p.id);
    const ratings = await prisma.review.groupBy({
      by: ["productId"],
      where: { productId: { in: ids }, isApproved: true },
      _avg: { rating: true },
    });
    const ratingMap = new Map(ratings.map((r) => [r.productId, r._avg.rating ?? 0]));
    result = result.map((p) => ({ ...p, _avgRating: ratingMap.get(p.id) ?? 0 } as any));
    if (query.minRating) result = (result as any[]).filter((p) => p._avgRating >= query.minRating!);
    if (query.sort === "rating") result = (result as any[]).sort((a, b) => b._avgRating - a._avgRating);
  }

  return { items: result, total, page: query.page, pageSize: query.pageSize };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      brand: true,
      category: true,
      reviews: {
        where: { isApproved: true },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!product || product.status !== "ACTIVE") throw ApiError.notFound("المنتج غير موجود");
  return product;
}

export async function createProduct(
  input: {
    name: string;
    slug: string;
    description?: string;
    specifications?: Record<string, unknown>;
    price: number;
    oldPrice?: number | null;
    categoryId: string;
    brandId?: string | null;
    status?: "DRAFT" | "ACTIVE" | "INACTIVE";
    images?: { url: string; altText?: string; sortOrder?: number }[];
    variants: { sku: string; color?: string | null; size?: string | null; price: number; stock: number }[];
  },
  adminId: string
) {
  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      specifications: input.specifications as any,
      price: input.price,
      oldPrice: input.oldPrice ?? null,
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      status: input.status ?? "DRAFT",
      images: input.images ? { create: input.images } : undefined,
      variants: { create: input.variants },
    },
    include: { variants: true, images: true },
  });
  return product;
}

export async function updateProductPrice(productId: string, newPrice: number, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound("المنتج غير موجود");
    const updated = await tx.product.update({ where: { id: productId }, data: { price: newPrice } });
    await tx.productPriceHistory.create({
      data: { productId, oldPrice: product.price, newPrice, changedBy: adminId },
    });
    return updated;
  });
}

export async function updateProduct(productId: string, data: Record<string, unknown>) {
  return prisma.product.update({ where: { id: productId }, data: data as any });
}

export async function setProductStatus(productId: string, status: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
  if (!productId) {
    throw ApiError.badRequest("معرف المنتج مفقود");
  }

  const existing = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!existing) {
    throw ApiError.notFound("المنتج غير موجود");
  }

  return prisma.product.update({
    where: { id: productId },
    data: { status },
  });
}

export async function deleteProduct(productId: string) {
  const orderCount = await prisma.orderItem.count({ where: { productId } });
  if (orderCount > 0) {
    return prisma.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });
  }
  await prisma.product.delete({ where: { id: productId } });
  return null;
}