import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/rbac.js";
import { hashPassword } from "../utils/password.js";
import { z } from "zod";

export const usersRouter = Router();

usersRouter.get("/users", requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, fullName: true, isActive: true, createdAt: true }
  });
  res.json(users);
}));

const createUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "STAFF"]),
  fullName: z.string().optional()
});

usersRouter.post("/users", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const body = createUserSchema.parse(req.body);
  const passwordHash = await hashPassword(body.password);

  const u = await prisma.user.create({
    data: { username: body.username, passwordHash, role: body.role, fullName: body.fullName }
  });

  res.status(201).json({ id: u.id, username: u.username, role: u.role, fullName: u.fullName });
}));
