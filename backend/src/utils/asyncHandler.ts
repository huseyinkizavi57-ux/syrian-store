import { NextFunction, Request, Response } from "express";

// Wraps async route handlers so rejected promises reach the error middleware
// instead of crashing the process / hanging the request.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
