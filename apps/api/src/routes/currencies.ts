import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/rbac.js";
import { z } from "zod";

export const currenciesRouter = Router();

currenciesRouter.get("/currencies", requireAuth, asyncHandler(async (_req, res) => {
  const rows = await prisma.currency.findMany({ orderBy: { code: "asc" } });
  res.json(rows);
}));

const createCurrencySchema = z.object({
  code: z.string().length(3),
  name: z.string().min(1),
  symbol: z.string().optional(),
  decimals: z.number().int().min(0).max(6).optional()
});

currenciesRouter.post("/currencies", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const b = createCurrencySchema.parse(req.body);
  const row = await prisma.currency.create({
    data: { code: b.code.toUpperCase(), name: b.name, symbol: b.symbol, decimals: b.decimals ?? 2 }
  });
  res.status(201).json(row);
}));
