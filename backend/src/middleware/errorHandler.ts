import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

// Single place where every error in the app ends up. Client always gets a
// consistent { error: { code, message, details? } } shape. Internal details
// (stack traces, raw DB errors, provider payloads) are logged server-side
// only, never sent to the client.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) console.error(err);
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "بيانات غير صالحة",
        details: err.flatten(),
      },
    });
  }

  // Prisma known errors (unique constraint, FK violation, etc.)
  if (err && typeof err === "object" && "code" in err && typeof (err as any).code === "string" && (err as any).code.startsWith("P")) {
    console.error("Prisma error:", err);
    const prismaCode = (err as any).code;
    if (prismaCode === "P2002") {
      return res.status(409).json({
        error: { code: "CONFLICT", message: "القيمة موجودة مسبقاً (تعارض في البيانات)" },
      });
    }
    return res.status(400).json({
      error: { code: "DATABASE_ERROR", message: "خطأ في معالجة الطلب" },
    });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "حدث خطأ غير متوقع" },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "المسار غير موجود" } });
}
