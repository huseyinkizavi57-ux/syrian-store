import rateLimit from "express-rate-limit";

// General API limiter — generous, just a backstop against abuse/DoS.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter specifically for auth endpoints — this is the one that
// actually matters for brute-force protection (the spec's general
// "rate limiting" requirement did not call this out separately, but a
// shared limit across all routes would be useless against password
// guessing since normal browsing burns the same budget).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "محاولات كثيرة جداً، حاول لاحقاً" } },
});

// Payment-attempt limiter — separate budget so someone can't hammer the
// payment-initiation endpoint.
export const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
