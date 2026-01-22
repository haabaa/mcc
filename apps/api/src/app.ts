import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";

import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { currenciesRouter } from "./routes/currencies.js";
import { ratesRouter } from "./routes/rates.js";
import { transactionsRouter } from "./routes/transactions.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", usersRouter);
  app.use("/api", currenciesRouter);
  app.use("/api", ratesRouter);
  app.use("/api", transactionsRouter);

  app.use(errorHandler);
  return app;
}
