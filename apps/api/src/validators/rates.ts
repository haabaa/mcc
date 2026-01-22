import { z } from "zod";

export const createRateSnapshotSchema = z.object({
  effectiveAt: z.string().datetime(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        currencyCode: z.string().length(3),
        baseCurrencyCode: z.string().length(3),
        buyRate: z.number().positive(),
        sellRate: z.number().positive()
      })
    )
    .min(1)
});
