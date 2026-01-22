import dotenv from "dotenv";
dotenv.config();

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),

  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  baseCurrencyCode: (process.env.BASE_CURRENCY_CODE ?? "MVR").toUpperCase(),

  jwtAccessSecret: req("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: req("JWT_REFRESH_SECRET"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "14d"
};
