import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "@prisma/client";

export type AccessTokenPayload = {
  sub: string;
  role: Role;
};

export type RefreshTokenPayload = {
  sub: string;
  tokenVersion: number;
};

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpiresIn });
}

export function signRefreshToken(payload: RefreshTokenPayload) {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
}
