import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { hashPassword, verifyPassword } from "../../utils/password";
import { revokeAllSessions } from "../auth/auth.service";
import { ApiError } from "../../utils/ApiError";

const router = Router();
router.use(requireAuth);

const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    email: z.string().email().optional().nullable(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.patch("/me", validate(updateProfileSchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: req.body });
  res.json({ data: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } });
}));

const changePasswordSchema = z.object({
  body: z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.post("/me/change-password", validate(changePasswordSchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  const valid = await verifyPassword(req.body.currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest("كلمة المرور الحالية غير صحيحة");
  const passwordHash = await hashPassword(req.body.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await revokeAllSessions(user.id); // force re-login everywhere after a password change
  res.json({ data: { message: "تم تغيير كلمة المرور" } });
}));

// ---- Addresses ----
const addressSchema = z.object({
  body: z.object({
    label: z.string().optional(),
    governorate: z.string().min(2),
    city: z.string().min(2),
    area: z.string().optional(),
    street: z.string().optional(),
    phone: z.string().regex(/^09\d{8}$/),
    isDefault: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

router.get("/me/addresses", asyncHandler(async (req, res) => {
  const addresses = await prisma.address.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" } });
  res.json({ data: addresses });
}));

router.post("/me/addresses", validate(addressSchema), asyncHandler(async (req, res) => {
  if (req.body.isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
  }
  const address = await prisma.address.create({ data: { ...req.body, userId: req.user!.id } });
  res.status(201).json({ data: address });
}));

router.patch("/me/addresses/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
  if (!existing) throw ApiError.notFound("العنوان غير موجود");
  if (req.body.isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
  }
  const address = await prisma.address.update({ where: { id: existing.id }, data: req.body });
  res.json({ data: address });
}));

router.delete("/me/addresses/:id", asyncHandler(async (req, res) => {
  await prisma.address.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
  res.status(204).send();
}));

export default router;
