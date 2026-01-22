import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "ValidationError", issues: err.issues });
  }
  // Surface common runtime errors nicely
  const msg = typeof err?.message === "string" ? err.message : "Internal error";
  console.error(err);
  return res.status(500).json({ error: "InternalServerError", message: msg });
}
