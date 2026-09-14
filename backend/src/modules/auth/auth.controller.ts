import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import * as authService from "./auth.service";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

const REFRESH_COOKIE = "refreshToken";
const isProd = process.env.NODE_ENV === "production";

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

export const register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(req.body);
  res.status(201).json({
    data: { id: user.id, firstName: user.firstName, lastName: user.lastName, phone: user.phone },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  const { accessToken, refreshToken } = await authService.loginUser(phone, password);
  setRefreshCookie(res, refreshToken);
  res.json({ data: { accessToken } });
});

export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginAdmin(email, password);
  res.json({ data: result });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized("لا توجد جلسة");
  const { accessToken, refreshToken } = await authService.refreshUserSession(token);
  setRefreshCookie(res, refreshToken);
  res.json({ data: { accessToken } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) await authService.logoutUser(token);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, firstName: true, lastName: true, phone: true, email: true, phoneVerified: true },
  });
  res.json({ data: user });
});

export const requestOtp = asyncHandler(async (req, res) => {
  await authService.requestPhoneOtp(req.body.phone, "PHONE_VERIFICATION");
  res.json({ data: { message: "تم إرسال رمز التحقق" } });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  await authService.verifyPhoneOtp(req.body.phone, req.body.code);
  res.json({ data: { message: "تم تفعيل رقم الهاتف" } });
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  await authService.requestPhoneOtp(req.body.phone, "PASSWORD_RESET");
  // Always the same response, whether or not the phone exists.
  res.json({ data: { message: "إذا كان الرقم مسجلاً، تم إرسال رمز إعادة التعيين" } });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPasswordWithOtp(req.body.phone, req.body.code, req.body.newPassword);
  res.json({ data: { message: "تم تغيير كلمة المرور بنجاح" } });
});
