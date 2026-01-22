import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";

export type AuthedRequest = Request & { user?: { id: string; role: string } };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });

  try {
    const token = hdr.slice("Bearer ".length);
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
