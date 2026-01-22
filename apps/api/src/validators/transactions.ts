import { z } from "zod";

export const createTransactionSchema = z.object({
  type: z.enum(["BUY", "SELL"]),
  channel: z.enum(["CASH", "BANK_TRANSFER", "MIXED"]),

  customer: z
    .object({
      name: z.string().min(1).optional(),
      nid: z.string().min(1).optional(),
      mobile: z.string().min(1).optional()
    })
    .optional(),

  foreignCurrency: z.string().length(3),
  foreignAmount: z.number().positive(),
  rateUsed: z.number().positive(),
  baseTotal: z.number().positive(),
  rateSnapshotId: z.string().uuid().optional(),

  payments: z
    .array(
      z.object({
        method: z.enum(["CASH", "BANK_TRANSFER"]),
        amountBase: z.number().positive(),
        bankName: z.string().min(1).optional(),
        bankAccount: z.string().min(1).optional(),
        bankRef: z.string().min(1).optional()
      })
    )
    .min(1),

  memo: z.string().optional()
}).superRefine((data, ctx) => {
  const sum = data.payments.reduce((a, p) => a + p.amountBase, 0);
  if (Math.abs(sum - data.baseTotal) > 0.01) {
    ctx.addIssue({ code: "custom", path: ["payments"], message: "Payments must sum to baseTotal" });
  }
  for (const [i, p] of data.payments.entries()) {
    if (p.method === "BANK_TRANSFER") {
      if (!p.bankName) ctx.addIssue({ code: "custom", path: ["payments", i, "bankName"], message: "bankName required" });
      if (!p.bankAccount) ctx.addIssue({ code: "custom", path: ["payments", i, "bankAccount"], message: "bankAccount required" });
    }
  }
});
