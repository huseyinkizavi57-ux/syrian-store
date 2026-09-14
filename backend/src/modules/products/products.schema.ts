import { z } from "zod";

const variantInput = z.object({
  sku: z.string().min(1),
  color: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
    description: z.string().optional(),
    specifications: z.record(z.any()).optional(),
    price: z.number().positive(),
    oldPrice: z.number().positive().optional().nullable(),
    categoryId: z.string().uuid(),
    brandId: z.string().uuid().optional().nullable(),
    status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).optional(),
    images: z.array(z.object({ url: z.string().min(1), altText: z.string().optional(), sortOrder: z.number().int().optional() })).optional(),
    // At least one variant is required. If the product has no real
    // color/size options, the caller should send a single variant with
    // color/size = null — this keeps the "stock always lives on a variant"
    // rule uniform (see schema.prisma decision #1).
    variants: z.array(variantInput).min(1, "يجب إضافة variant واحد على الأقل"),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const listProductsQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    search: z.string().optional(),
    category: z.string().uuid().optional(),
    brand: z.string().uuid().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    inStock: z.coerce.boolean().optional(),
    minRating: z.coerce.number().min(1).max(5).optional(),
    sort: z.enum(["newest", "price_asc", "price_desc", "best_selling", "rating"]).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});