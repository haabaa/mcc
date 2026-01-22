# FX POS / Ledger Starter (Self-hosted)

Monorepo:
- `apps/api` — Node.js/Express + Prisma + PostgreSQL + JWT (access + refresh) + RBAC + Zod
- `apps/web` — React + Vite + Tailwind (mobile-friendly starter)

## Quick start (Docker)
1. Copy env:
   ```bash
   cp .env.example .env
   ```
2. Start:
   ```bash
   docker compose --env-file .env up --build
   ```
3. Create the first migration (one-time, dev):
   ```bash
   cd apps/api
   npx prisma migrate dev --name init
   ```

Web: http://localhost:5173  
API health: http://localhost:4000/api/health

## Notes
- Base ledger currency is set via `BASE_CURRENCY_CODE` (default: `MVR`).
- Refresh token revocation is handled via `users.tokenVersion` (logout increments it).
