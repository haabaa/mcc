import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/rbac.js";
import { createTransactionSchema } from "../validators/transactions.js";
import { env } from "../config/env.js";

export const transactionsRouter = Router();

transactionsRouter.get("/transactions", requireAuth, asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const rows = await prisma.transaction.findMany({
    where: {
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {})
    },
    orderBy: { createdAt: "desc" },
    include: { legs: true, payments: true }
  });

  res.json(rows);
}));

transactionsRouter.get("/transactions/:id", requireAuth, asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const row = await prisma.transaction.findUnique({
    where: { id },
    include: { legs: true, payments: true }
  });
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
}));

transactionsRouter.post("/transactions", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const body = createTransactionSchema.parse(req.body);

  const fxCode = body.foreignCurrency.toUpperCase();
  const baseCode = env.baseCurrencyCode; // MVR

  const created = await prisma.$transaction(async (tx) => {
    // Ensure base currency exists in currencies table (for the base leg)
    // If it doesn't, create it as a fallback so transactions won't fail.
    await tx.currency.upsert({
      where: { code: baseCode },
      update: {},
      create: { code: baseCode, name: baseCode, decimals: 2, isActive: true }
    });

    // Ensure inventory balance row exists
    const bal = await tx.inventoryBalance.upsert({
      where: { currencyCode: fxCode },
      update: {},
      create: { currencyCode: fxCode, onHand: 0, avgCostInBase: 0 }
    });

    const onHand = Number(bal.onHand);
    const avgCost = Number(bal.avgCostInBase);

    const qty = body.foreignAmount;
    const rate = body.rateUsed;
    const baseTotal = body.baseTotal;

    const deltaAmount = body.type === "BUY" ? +qty : -qty;

    // Oversell protection (toggle later with a config)
    if (body.type === "SELL" && onHand + deltaAmount < -0.000001) {
      throw new Error(`Insufficient inventory for ${fxCode}. On hand: ${onHand}, trying to sell: ${qty}`);
    }

    // Weighted average cost
    let newOnHand = onHand + deltaAmount;
    let newAvgCost = avgCost;

    if (body.type === "BUY") {
      const invValueOld = onHand * avgCost;
      const invValueNew = invValueOld + qty * rate;
      newAvgCost = newOnHand <= 0 ? 0 : invValueNew / newOnHand;
    }

    const costBasisRate = body.type === "SELL" ? avgCost : undefined;

    const txRow = await tx.transaction.create({
      data: {
        type: body.type,
        channel: body.channel,
        customerName: body.customer?.name,
        customerNid: body.customer?.nid,
        customerMobile: body.customer?.mobile,
        memo: body.memo,
        cashierId: req.user!.id,
        rateSnapshotId: body.rateSnapshotId
      }
    });

    // Ledger legs: FX leg + base leg
    await tx.transactionLeg.createMany({
      data: [
        {
          transactionId: txRow.id,
          currencyCode: fxCode,
          direction: body.type === "BUY" ? "IN" : "OUT",
          amount: qty,
          rateUsed: rate,
          valueInBase: baseTotal
        },
        {
          transactionId: txRow.id,
          currencyCode: baseCode,
          direction: body.type === "BUY" ? "OUT" : "IN",
          amount: baseTotal,
          rateUsed: 1,
          valueInBase: baseTotal
        }
      ]
    });

    await tx.payment.createMany({
      data: body.payments.map((p) => ({
        transactionId: txRow.id,
        method: p.method,
        amountBase: p.amountBase,
        bankName: p.bankName,
        bankAccount: p.bankAccount,
        bankRef: p.bankRef
      }))
    });

    const deltaCostBase = body.type === "BUY" ? +(qty * rate) : -(qty * avgCost);

    await tx.inventoryMovement.create({
      data: {
        currencyCode: fxCode,
        transactionId: txRow.id,
        deltaAmount,
        costBasisRate: costBasisRate,
        deltaCostBase
      }
    });

    await tx.inventoryBalance.update({
      where: { currencyCode: fxCode },
      data: {
        onHand: newOnHand,
        avgCostInBase: newAvgCost
      }
    });

    await tx.auditEvent.create({
      data: {
        actorId: req.user!.id,
        action: "TX_POST",
        entityType: "transaction",
        entityId: txRow.id,
        metadata: { ...body, foreignCurrency: fxCode, baseCurrency: baseCode }
      }
    });

    return txRow;
  });

  res.status(201).json(created);
}));

transactionsRouter.post("/transactions/:id/void", requireAuth, requireAdmin, asyncHandler(async (req: AuthedRequest, res) => {
  const id = String(req.params.id);
  const reason = String(req.body?.reason ?? "VOID");

  const row = await prisma.transaction.findUnique({ where: { id } });
  if (!row) return res.status(404).json({ error: "Not found" });
  if (row.status === "VOIDED") return res.status(400).json({ error: "Already voided" });

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      status: "VOIDED",
      voidedAt: new Date(),
      voidReason: reason,
      voidedById: req.user!.id
    }
  });

  await prisma.auditEvent.create({
    data: { actorId: req.user!.id, action: "TX_VOID", entityType: "transaction", entityId: id, metadata: { reason } }
  });

  res.json(updated);
}));
