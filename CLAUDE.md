# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

乖宝宝儿童影楼管理系统 (Baby Photo Studio Management System) — a full-stack management platform for a baby photography studio. The system handles orders, payments, scheduling, inventory/stock, supply chain (purchasing), CRM/marketing, and WeChat mini-program integration.

## Tech Stack

- **Backend**: NestJS 11 (TypeScript), Prisma ORM 6, PostgreSQL 17, Redis 7, JWT auth, Swagger
- **Frontend (Admin)**: React 18, Vite 5, Ant Design 5, Redux Toolkit, ECharts, React Router 6
- **Mini Program**: WeChat mini-program (client/psyd/)
- **Infrastructure**: Docker Compose, Nginx reverse proxy, Docker multi-stage builds

## Architecture

### Backend (`server/baby-photo-backend/`)

NestJS modular structure with two directory categories:

- **`src/modules/`** — Business modules, each self-contained with controller/service/DTO:
  - Core biz: `users`, `packages`, `package-categories`, `orders`, `payments`, `time-slots`
  - WeChat: `wx-auth`, `wx-mall`, `wx-cart`, `wx-order`, `wx-coupon`, `wx-address`, `wx-user`
  - Inventory: `stock-outbound`, `stock-check`, `stock-alert`, `stock-transfer`, `stock-transaction`, `inventory-intelligence`
  - Supply chain: handled under `src/supplier/` (purchase orders, inbound, in-transit, supplier mgmt)
  - CRM/Marketing: `crm`, `smart-marketing`, `coupons`, `automation-rules`
  - System: `auth`, `roles`, `operation-logs`, `files`, `export`, `system-backup`, `search`
  - Other: `analytics`, `statistics-analysis`, `status-monitoring`, `notifications`, `shop-info`, `print-settings`
- **`src/shared/`** — Cross-cutting concerns: `prisma`, `guards`, `decorators`, `filters`, `interceptors`, `schedulers`, `services`, `cache`, `config`, `enums`, `exceptions`, `validators`, `utils`
- **`src/payment/`** — Payment-specific controllers/services
- **Database**: Prisma schema in `prisma/schema.prisma` (PostgreSQL), with seed scripts in `prisma/`
- **Entry**: `src/main.ts` — configures CORS, Swagger, global validation, Sentry, default role seeding
- **API prefix**: `/api/v1/`, Swagger at `/api/docs`

### Frontend (`client/admin-frontend/`)

React SPA with Vite:

- **`src/pages/`** — Route pages grouped by domain (Orders, Packages, Payments, Stock, Suppliers, Marketing, CRM, System, etc.)
- **`src/components/`** — Shared UI components (Layout, ProtectedRoute, ImageUpload, RichTextEditor, Calculator)
- **`src/store/`** — Redux Toolkit store
- **`src/services/`** — API client layer
- **`src/utils/`** — Utility functions
- **`src/hooks/`**, **`src/contexts/`**, **`src/types/`**, **`src/config/`**, **`src/constants/`**
- **Routing**: `App.tsx` defines all routes with lazy-loaded pages, ProtectedRoute wrapper, Chinese locale
- **Dev proxy**: Vite proxies `/api` to backend (configurable via `VITE_BACKEND_URL`)

### WeChat Mini Program (`client/psyd/`)

Separate mini-program project under `client/psyd/miniprogram/`.

## Development Commands

### Backend
```bash
cd server/baby-photo-backend
npm run start:dev        # Watch mode
npm run build            # Compile
npm run test             # Jest unit tests
npm run test:e2e         # Jest e2e tests (config in test/jest-e2e.json)
npm run lint             # ESLint --fix
npm run typecheck        # tsc --noEmit
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run dev migrations
npm run prisma:studio    # Open Prisma Studio (also via Docker: profile db-admin)
```

### Frontend
```bash
cd client/admin-frontend
npm run dev              # Vite dev server on port 3001
npm run build            # TypeScript check + Vite build
npm run test             # Vitest
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
```

### E2E (Root)
```bash
npm run test:e2e         # Playwright tests in tests/e2e/
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:debug   # Playwright debug mode
npm run seed:e2e         # Seed data for e2e tests (runs server/scripts/seed-e2e.js)
```

### Docker
```bash
docker compose up -d                              # Start all services (default: backend + postgres + redis)
docker compose --profile production up -d         # Production stack with admin-frontend + nginx
docker compose --profile dev up -d                # Dev stack with hot-reload frontend
docker compose --profile db-admin up -d           # Include Prisma Studio
bash deploy.sh [production|staging]               # Full deploy: pull, migrate, start, healthcheck
```

## Key Config Files

- `docker-compose.yml` — Main compose file with profiles (dev/production/db-admin)
- `docker-compose.prod.yml` — Production overrides
- `nginx.conf` — Reverse proxy (HTTP→HTTPS redirect, API proxy, static files)
- `server/baby-photo-backend/.env` — Backend env vars (JWT_SECRET, DATABASE_URL, WX_*, etc.)
- `client/admin-frontend/vite.config.ts` — Vite proxy, path aliases (`@/`), build chunks
- `playwright.config.ts` — Root-level Playwright config targeting `tests/e2e/`
