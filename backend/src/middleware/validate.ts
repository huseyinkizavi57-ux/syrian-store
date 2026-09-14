import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

// Validates and REPLACES req.body/query/params with the parsed (and
// coerced/defaulted) result, so downstream handlers can trust the shape.
export function validate(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;
    next();
  };
}
