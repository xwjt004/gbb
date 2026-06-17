# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

乖宝宝儿童影楼管理系统 (Baby Photo Studio Management System) — a full-stack management platform for a baby photography studio. The system handles orders, payments, scheduling, inventory/stock, supply chain (purchasing), CRM/marketing, and WeChat mini-program integration.

## Tech Stack

- **Backend**: NestJS 11 (TypeScript), Prisma ORM 6, PostgreSQL 17, Redis 7, JWT auth, Swagger
- **Admin Frontend**: React 18, Vite 5, Ant Design 5, Redux Toolkit, ECharts, React Router 6
- **Store Frontend**: React 18, Vite 5, custom CSS (separate from admin)
- **Mini Program**: WeChat mini-program (client/psyd/) with Vant Weapp UI
- **Infrastructure**: Docker Compose, Nginx reverse proxy, Docker multi-stage builds

## Architecture

### Backend (`server/baby-photo-backend/`)

NestJS modular structure with four directory categories:

- **`src/modules/`** — Business modules, each self-contained with controller/service/DTO/entity:
  - Core biz: `users`, `packages`, `package-categories`, `orders`, `payments`, `time-slots`, `service-items`, `diy-packages`
  - WeChat integration: `wx-auth`, `wx-mall`, `wx-cart`, `wx-order`, `wx-coupon`, `wx-address`, `wx-user`, `wx-favorite`
  - Inventory: `stock-outbound`, `stock-check`, `stock-alert`, `stock-transfer`, `stock-transaction`, `inventory-intelligence`
  - CRM/Marketing: `crm`, `smart-marketing`, `coupons`, `automation-rules`, `group-buy`, `discount-rules`
  - System: `auth`, `roles`, `operation-logs`, `files`, `export`, `system-backup`, `search`, `notifications`, `status-monitoring`
  - Products/Sales: `products`, `product-categories`, `photo-albums`, `seasonal-prices`
  - Other: `analytics`, `statistics-analysis`, `shop-info`, `print-settings`
- **`src/supplier/`** — Supply chain module, standalone domain with sub-controllers:
  - `purchase-order.controller/service` — 采购订单
  - `inbound.controller/service` — 入库管理
  - `in-transit.controller/service` — 在途管理
  - `supplier.controller/service` — 供应商管理
  - `payment.controller/service` — 采购付款
  - `refund.controller/service` — 采购退款
- **`src/shared/`** — Cross-cutting concerns:
  - `prisma/` — PrismaModule (global DB service)
  - `guards/` — `PermissionGuard` (checks `@Permission()` decorator against `RolePermission` model)
  - `decorators/` — `@Permission('module:action')` for role-based access control
  - `filters/` — `AllExceptionsFilter` (unified error response format)
  - `interceptors/` — `OperationLogInterceptor` (global APP_INTERCEPTOR, logs all mutations)
  - `pipes/` — Custom validation pipes
  - `schedulers/` — Cron jobs: `order-timeout`, `crm`, `appointment-reminder`, `photo-pick-reminder`, `daily-report`
  - `services/` — `auto-status-transition`, `status-change-log`
  - `cache/` — Cache module/interface/service
  - `config/` — `env-validator` (validates required env vars at startup)
  - `enums/` — Shared enums (payment-status, payment-system, order-status)
  - `exceptions/` — `BusinessException` for domain-specific errors
  - `validators/` — Custom validators (order-status transitions)
  - `utils/` — Utilities (date, masking, payment-adapter)
- **`src/payment/`** — Payment-specific controllers/services
- **`src/types/`** — TypeScript type definitions
- **Database**: Prisma schema in `prisma/schema.prisma` (PostgreSQL, ~1800 lines, 43+ models)
- **Entry**: `src/main.ts` — CORS config, Swagger, global ValidationPipe, Sentry init, X-HTTP-Method-Override for WeChat PATCH, default role seeding, security startup checks (JWT_SECRET validation in production)
- **API prefix**: `/api/v1/`, Swagger at `/api/docs`

#### Prisma Conventions

- Models use `@@map("snake_case_table_names")` for table naming
- Fields use `@map("snake_case_column")` — all code references camelCase but DB stores snake_case
- Timestamps: `createdAt` / `updatedAt` mapped to `created_at` / `updated_at`
- Composite indexes via `@@index([field1, field2])`
- Enums defined as Prisma enums (e.g., `UserStatus`) map to PostgreSQL enums
- Role permissions stored as `"module:action"` strings (e.g., `"orders:edit"`)

#### Global Infrastructure (in `AppModule`)

- **Rate limiting**: ThrottlerModule — 10 req/s (short), 50 req/10s (medium), 200 req/min (long)
- **Scheduling**: ScheduleModule for cron jobs
- **Validation**: Global `ValidationPipe` with `whitelist`, `transform`, `forbidNonWhitelisted`
- **File serving**: ServeStaticModule maps `/uploads` to the uploads directory
- **Config**: ConfigModule reads `.env.local` then `.env` (both optional, `isGlobal: true`)

#### Env Files

- `server/baby-photo-backend/.env` — Active config (JWT_SECRET, DATABASE_URL, WX_*, SENTRY_DSN, CORS_ORIGIN, etc.)
- `server/baby-photo-backend/.env.example` — Template for new setups
- `server/baby-photo-backend/.env.production.example` — Production template with secure defaults

### Admin Frontend (`client/admin-frontend/`)

React SPA with Vite:

- **`src/pages/`** — ~30 route page directories grouped by domain (Orders, Packages, Payments, Stock, Suppliers, Marketing, CRM, System, Users, WxUsers, Analytics, Dashboard, DiyPackages, DiscountRules, Export, etc.)
- **`src/components/`** — Shared UI components (Layout, ProtectedRoute, ImageUpload, RichTextEditor, Calculator)
- **`src/store/`** — Redux Toolkit store (authSlice, userSlice, orderSlice, packageSlice, networkSlice, globalSlice)
- **`src/services/`** — API client layer:
  - `api.ts` — Axios instance with interceptors (JWT token injection, 401→redirect, 5xx auto-retry for GET, `api:success`/`api:error` custom events). Exports `request` (wraps `AxiosResponse`) and `simple` (unwraps to `ApiResponse<T>` directly)
  - ~30 domain service files (orders, packages, users, payments, etc.) each importing from `api.ts`
- **`src/utils/`** — Utility functions
- **`src/hooks/`**, **`src/contexts/`**, **`src/types/`**, **`src/config/`**, **`src/constants/`**, **`src/styles/`**
- **Routing**: `App.tsx` defines lazy-loaded routes with `ProtectedRoute` wrapper, Chinese locale
- **Dev proxy**: Vite proxies `/api` to backend (configurable via `VITE_BACKEND_URL`)
- **Base path**: `/admin/` (served behind nginx at `/admin/`)

### Store Frontend (`client/ps-frontend/`)

Separate React SPA for customer-facing store:

- **`src/pages/`** — Customer-facing pages (shopping, ordering, etc.)
- **`src/components/`** — Shared components
- **`src/services/`** — API client layer
- Built with Vite, separate from admin frontend
- Docker dev (port 3003) and production (port 3004 via nginx upstream `storefront`) setups

### WeChat Mini Program (`client/psyd/`)

Separate mini-program project under `client/psyd/miniprogram/`:

- **UI Framework**: Vant Weapp (`@vant/weapp`) — action-sheet, button, card, dialog, empty, field, goods-action, navbar, notice-bar, popup, search, stepper, submit-bar, tabbar, toast, uploader, etc.
- **Pages**: 37+ pages covering: packages/products browsing, booking flow (date→time→info→confirm), cart, order lifecycle (confirm/list/detail), payment (payment/agreement/result), address management, coupons, user profile/settings, member/points, favorites, appointment scheduling
- **Tab Bar**: 4 tabs — 预约(Packages), 商品(Products), 购物车(Cart), 我的(Profile)
- **Auth**: WeChat OAuth (wx.login → code exchange), phone number binding, agreement pages
- **API calls**: Uses wx.request directly (not axios), with JWT token from wx-auth flow
- **Key entry files**: `app.json` (page registration + tab bar), `app.ts` (global lifecycle), `app.wxss` (global styles)

## Development Commands

### Backend
```bash
cd server/baby-photo-backend
npm run start:dev        # Watch mode (port 3000)
npm run start:debug      # Debug + watch mode
npm run build            # Compile
npm run test             # Jest unit tests (*.spec.ts)
npm run test:watch       # Jest watch mode
npm run test:cov         # Jest with coverage
npm run test:e2e         # Jest e2e tests (config in test/jest-e2e.json)
npm run lint             # ESLint --fix
npm run typecheck        # tsc --noEmit
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run dev migrations
npm run prisma:studio    # Open Prisma Studio (port 5555, also via Docker: profile db-admin)
npm run seed:e2e         # Seed data for e2e tests
```

### Frontend (Admin)
```bash
cd client/admin-frontend
npm run dev              # Vite dev server on port 3001
npm run build            # TypeScript check + Vite build
npm run test             # Vitest (jsdom environment)
npm run lint             # ESLint (.ts, .tsx)
npm run typecheck        # tsc --noEmit
npm run preview          # Preview production build
```

### E2E (Root)
```bash
npm run test:e2e         # Playwright tests in tests/e2e/
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:debug   # Playwright debug mode
npm run test:e2e:report  # Show Playwright report
npm run seed:e2e         # Seed data (runs server/scripts/seed-e2e.js)
```

### Docker
```bash
docker compose up -d                              # Start backend + postgres + redis
docker compose --profile production up -d         # Full production stack (+nginx, admin-frontend, storefront)
docker compose --profile dev up -d                # Dev stack with hot-reload frontends
docker compose --profile db-admin up -d           # Include Prisma Studio
bash deploy.sh [production|staging]               # Full deploy: pull, migrate, start, healthcheck
```

## Key Config Files

- `docker-compose.yml` — Main compose file (postgres, redis, backend, nginx, frontends, prisma-studio)
- `docker-compose.prod.yml` / `docker-compose.dev.yml` — Environment overrides
- `nginx.conf` — Reverse proxy: HTTP→HTTPS redirect, `/api/`→backend, `/admin/`→admin-frontend, `/`→storefront
- `deploy.sh` — One-click deploy script (Docker-based)
- `playwright.config.ts` — Root-level Playwright config targeting `tests/e2e/`
- `server/baby-photo-backend/.env` — Backend env vars
- `client/admin-frontend/vite.config.ts` — Vite proxy, path aliases (`@/`), build chunks
