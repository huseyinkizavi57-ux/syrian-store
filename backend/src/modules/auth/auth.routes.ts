import { Router } from "express";
import { validate } from "../../middleware/validate";
import { requireAuth } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rateLimit";
import * as ctrl from "./auth.controller";
import {
  adminLoginSchema,
  loginSchema,
  registerSchema,
  requestOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "./auth.schema";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), ctrl.register);
router.post("/login", authLimiter, validate(loginSchema), ctrl.login);
router.post("/admin/login", authLimiter, validate(adminLoginSchema), ctrl.adminLogin);
router.post("/refresh", ctrl.refresh);
router.post("/logout", ctrl.logout);
router.get("/me", requireAuth, ctrl.me);

router.post("/otp/request", authLimiter, validate(requestOtpSchema), ctrl.requestOtp);
router.post("/otp/verify", authLimiter, validate(verifyOtpSchema), ctrl.verifyOtp);
router.post("/password/forgot", authLimiter, validate(requestOtpSchema), ctrl.requestPasswordReset);
router.post("/password/reset", authLimiter, validate(resetPasswordSchema), ctrl.resetPassword);

export default router;
