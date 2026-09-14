import crypto from "crypto";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { hashPassword, verifyPassword } from "../../utils/password";
import {
  generateRefreshToken,
  hashToken,
  refreshTokenExpiry,
  signAccessToken,
} from "../../utils/tokens";

// NOTE: No SMS provider was specified (same situation as Sham Cash — spec
// says not to invent credentials/integrations). This generates/validates
// OTPs correctly; delivery is a stub that logs to console in dev. Swapping
// in a real SMS gateway later is a one-function change.
async function sendSms(phone: string, message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[MOCK SMS] to ${phone}: ${message}`);
    return;
  }
  throw ApiError.internal("مزود الرسائل النصية غير مُهيأ بعد");
}

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function registerUser(input: {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (existing) throw ApiError.conflict("رقم الهاتف مسجل مسبقاً");

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email,
      passwordHash,
      cart: { create: {} },
    },
  });
  return user;
}

export async function loginUser(phone: string, password: string) {
  const user = await prisma.user.findUnique({ where: { phone } });
  // Same error for "not found" and "wrong password" — avoid account enumeration.
  if (!user || !user.isActive) throw ApiError.unauthorized("رقم الهاتف أو كلمة المرور غير صحيحة");
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("رقم الهاتف أو كلمة المرور غير صحيحة");
  return issueTokenPair(user.id);
}

export async function loginAdmin(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.isActive) throw ApiError.unauthorized("البريد أو كلمة المرور غير صحيحة");
  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) throw ApiError.unauthorized("البريد أو كلمة المرور غير صحيحة");
  const accessToken = signAccessToken({ sub: admin.id, type: "admin", role: admin.role });
  return { accessToken, admin: { id: admin.id, fullName: admin.fullName, role: admin.role } };
}

async function issueTokenPair(userId: string) {
  const accessToken = signAccessToken({ sub: userId, type: "user" });
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(refreshToken), expiresAt: refreshTokenExpiry() },
  });
  return { accessToken, refreshToken };
}

export async function refreshUserSession(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized("جلسة غير صالحة، الرجاء تسجيل الدخول مجدداً");
  }
  // Rotate: revoke old token, issue a new pair (limits blast radius of theft).
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  return issueTokenPair(stored.userId);
}

export async function logoutUser(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function requestPhoneOtp(phone: string, purpose: "PHONE_VERIFICATION" | "PASSWORD_RESET") {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    if (purpose === "PASSWORD_RESET") return; // don't reveal whether phone exists
    throw ApiError.notFound("المستخدم غير موجود");
  }
  const code = generateOtp();
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.verificationToken.create({ data: { userId: user.id, purpose, codeHash, expiresAt } });
  await sendSms(phone, `رمز التحقق الخاص بك: ${code} (صالح لمدة 10 دقائق)`);
}

export async function verifyPhoneOtp(phone: string, code: string) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw ApiError.badRequest("رمز غير صحيح");
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const token = await prisma.verificationToken.findFirst({
    where: { userId: user.id, purpose: "PHONE_VERIFICATION", codeHash, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!token) throw ApiError.badRequest("رمز غير صحيح أو منتهي الصلاحية");
  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } }),
  ]);
}

export async function resetPasswordWithOtp(phone: string, code: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw ApiError.badRequest("رمز غير صحيح");
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const token = await prisma.verificationToken.findFirst({
    where: { userId: user.id, purpose: "PASSWORD_RESET", codeHash, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!token) throw ApiError.badRequest("رمز غير صحيح أو منتهي الصلاحية");
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
  ]);
  await revokeAllSessions(user.id);
}
