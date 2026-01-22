import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loginSchema, refreshSchema } from "../validators/auth.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { verifyPassword } from "../utils/password.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/auth/login", asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { username: body.username } });
  if (!user || !user.isActive) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, tokenVersion: user.tokenVersion });

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName }
  });
}));

authRouter.post("/auth/refresh", asyncHandler(async (req, res) => {
  const body = refreshSchema.parse(req.body);
  const payload = verifyRefreshToken(body.refreshToken);

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) return res.status(401).json({ error: "Invalid refresh token" });

  if (user.tokenVersion !== payload.tokenVersion) {
    return res.status(401).json({ error: "Refresh token revoked" });
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, tokenVersion: user.tokenVersion });

  res.json({ accessToken, refreshToken });
}));

authRouter.post("/auth/logout", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { tokenVersion: { increment: 1 } }
  });
  res.json({ ok: true });
}));

authRouter.get("/auth/me", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ id: user.id, username: user.username, role: user.role, fullName: user.fullName });
}));
