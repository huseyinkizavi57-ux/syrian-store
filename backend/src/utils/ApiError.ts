// Unified application error used across the codebase. The error handler
// middleware maps this to a consistent JSON shape and never leaks internals
// (stack traces, DB errors, etc.) to the client.
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }
  static unauthorized(message = "غير مصرح") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "ممنوع") {
    return new ApiError(403, "FORBIDDEN", message);
  }
  static notFound(message = "غير موجود") {
    return new ApiError(404, "NOT_FOUND", message);
  }
  static conflict(message: string, details?: unknown) {
    return new ApiError(409, "CONFLICT", message, details);
  }
  static validation(message: string, details?: unknown) {
    return new ApiError(422, "VALIDATION_ERROR", message, details);
  }
  static tooManyRequests(message = "طلبات كثيرة جداً، حاول لاحقاً") {
    return new ApiError(429, "TOO_MANY_REQUESTS", message);
  }
  static internal(message = "خطأ في الخادم") {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}
