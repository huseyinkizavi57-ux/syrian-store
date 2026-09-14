import { z } from "zod";

const syrianPhone = z
  .string()
  .regex(/^09\d{8}$/, "رقم هاتف سوري غير صالح (مثال: 0912345678)");

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    phone: syrianPhone,
    email: z.string().email().optional(),
    password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    phone: syrianPhone,
    password: z.string().min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const requestOtpSchema = z.object({
  body: z.object({ phone: syrianPhone }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const verifyOtpSchema = z.object({
  body: z.object({ phone: syrianPhone, code: z.string().length(6) }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    phone: syrianPhone,
    code: z.string().length(6),
    newPassword: z.string().min(8),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
