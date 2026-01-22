import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/rbac.js";
import { createRateSnapshotSchema } from "../validators/rates.js";
import type { AuthedRequest } from "../middleware/auth.js";

export const ratesRouter = Router();

ratesRouter.get("/rates/current", requireAuth, asyncHandler(async (_req, res) => {
  const rows = await prisma.rateSnapshot.findMany({
    orderBy: [{ currencyCode: "asc" }, { effectiveAt: "desc" }, { createdAt: "desc" }]
  });

  const map = new Map<string, any>();
  for (const r of rows) {
    if (!map.has(r.currencyCode)) map.set(r.currencyCode, r);
  }
  res.json(Array.from(map.values()));
}));

ratesRouter.get("/rates/:code/history", requireAuth, asyncHandler(async (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const rows = await prisma.rateSnapshot.findMany({
    where: {
      currencyCode: code,
      ...(from || to ? { effectiveAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {})
    },
    orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }]
  });
  res.json(rows);
}));

ratesRouter.post("/rates", requireAuth, requireAdmin, asyncHandler(async (req: AuthedRequest, res) => {
  const body = createRateSnapshotSchema.parse(req.body);

  const created = await prisma.$transaction(async (tx) => {
    const rows = [];
    for (const item of body.items) {
      const row = await tx.rateSnapshot.create({
        data: {
          currencyCode: item.currencyCode.toUpperCase(),
          baseCurrencyCode: item.baseCurrencyCode.toUpperCase(),
          buyRate: item.buyRate,
          sellRate: item.sellRate,
          effectiveAt: new Date(body.effectiveAt),
          notes: body.notes,
          createdById: req.user!.id
        }
      });
      rows.push(row);
      await tx.auditEvent.create({
        data: {
          actorId: req.user!.id,
          action: "RATE_CREATE",
          entityType: "rate_snapshot",
          entityId: row.id,
          metadata: item
        }
      });
    }
    return rows;
  });

  res.status(201).json(created);
}));
