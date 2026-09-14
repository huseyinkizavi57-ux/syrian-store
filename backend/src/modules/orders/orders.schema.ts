import { z } from "zod";

export const createOrderSchema = z.object({
  body: z.object({
    addressId: z.string().uuid(),
    couponCode: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
    note: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }).passthrough(),
});