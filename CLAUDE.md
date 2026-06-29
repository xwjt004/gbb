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
  - WeChat integration: `wx-auth`, `wx-mall`, `wx-cart`, `wx-order`, `wx-coupon`, `wx-address`, `wx-user`, `wx-favorite`, `wx-official-account`
  - Inventory: `stock-outbound`, `stock-check`, `stock-alert`, `stock-transfer`, `stock-transaction`, `inventory-intelligence`
  - CRM/Marketing: `crm`, `smart-marketing`, `coupons`, `automation-rules`, `group-buy`, `discount-rules`
  - System: `auth`, `roles`, `operation-logs`, `files`, `export`, `system-backup`, `search`, `notifications`, `status-monitoring`
  - Products/Sales: `products`, `product-categories`, `photo-albums`, `seasonal-prices`
  - Other: `analytics`, `statistics-analysis`, `shop-info`, `print-settings`, `work-categories`, `photographers`
- **`src/supplier/`** — Supply chain module, standalone domain with sub-controllers for purchase-order, inbound, in-transit, supplier, payment, refund
- **`src/shared/`** — Cross-cutting concerns: prisma, guards, decorators, filters, interceptors, pipes, schedulers, services, cache, config, enums, exceptions, validators, utils
- **`src/payment/`** — Payment-specific controllers/services
- **`src/types/`** — TypeScript type definitions
- **Database**: Prisma schema in `prisma/schema.prisma` (PostgreSQL, 43+ models)
- **Entry**: `src/main.ts` — CORS config, Swagger, global ValidationPipe, Sentry init, X-HTTP-Method-Override for WeChat PATCH, default role seeding, security startup checks
- **API prefix**: `/api/v1/`, Swagger at `/api/docs`

#### Module Convention

Each business module follows a consistent pattern:
- `*.module.ts` — imports PrismaModule, registers controller+service, exports service if needed by other modules
- `*.controller.ts` — decorated with `@ApiTags()`, `@ApiBearerAuth()`, `@UseGuards(AdminJwtAuthGuard)` at class level, public endpoints use `@Public()` decorator
- `*.service.ts` — `@Injectable()`, injects PrismaService via constructor
- `dto/*.dto.ts` — class-validator + class-transformer for request validation

#### API Response Format

**Success**: `{ success: true, data: ... }`
**Error** (via BusinessException subclasses): `{ success: false, statusCode: number, message: string, errorCode?: string, timestamp: string, path: string }`

Built-in BusinessException subclasses (in `shared/exceptions/`):
- `NotFoundException` (404, NOT_FOUND)
- `ConflictException` (409, CONFLICT)
- `ValidateException` (422, VALIDATE_FAILED)
- `UnauthorizedException` (401, UNAUTHORIZED)
- `ForbiddenException` (403, FORBIDDEN)

Use these in services rather than NestJS built-in exceptions.

#### Pagination Convention

Controllers accept `@Query('page') page = 1, @Query('pageSize') pageSize = 20`. Services return:
```ts
{ list: T[], pagination: { current: number, pageSize: number, total: number } }
```

#### Authentication & Authorization

- **Admin endpoints**: `AdminJwtAuthGuard` (passport JWT strategy for admin-jwt) — applied per-controller via `@UseGuards(AdminJwtAuthGuard)`. Public endpoints use `@Public()` decorator.
- **Permission control**: `PermissionGuard` checks `@RequirePermission('module:action')` against user roles. Wildcard `*:*` = super admin, `module:*` = all actions for a module.
- **Mini-program auth**: WeChat OAuth flow via `wx-auth` module (wx.login → code exchange → JWT). Refresh token mechanism with auto-retry on 401.
- **Token storage**: Admin stores `admin_token` in localStorage. Mini-program stores in wx storage with key from config.

#### Global Infrastructure (in AppModule)

- **Rate limiting**: ThrottlerModule — 30 req/s (short), 150 req/10s (medium), 600 req/min (long)
- **Scheduling**: ScheduleModule for cron jobs (order-timeout, crm, appointment-reminder, photo-pick-reminder, daily-report, group-buy)
- **Validation**: Global `ValidationPipe` with `whitelist`, `transform`, `forbidNonWhitelisted`
- **File serving**: ServeStaticModule maps `/uploads` to the uploads directory
- **Config**: ConfigModule reads `.env.local` then `.env` (both optional, `isGlobal: true`)
- **Operation Logging**: Global `OperationLogInterceptor` auto-logs all POST/PUT/PATCH/DELETE requests with module/action/operator/IP, excludes password fields

#### Prisma Conventions

- Models use `@@map("snake_case_table_names")` for table naming
- Fields use `@map("snake_case_column")` — all code references camelCase but DB stores snake_case
- Timestamps: `createdAt` / `updatedAt` mapped to `created_at` / `updated_at`
- Composite indexes via `@@index([field1, field2])`
- Enums defined as Prisma enums (e.g., `UserStatus`) map to PostgreSQL enums
- Role permissions stored as `"module:action"` strings (e.g., `"orders:edit"`)
- Key enums in `shared/enums/status.enum.ts`: `OrderStatus`, `PaymentStatus` (with deprecated backward-compat aliases)

#### Env Files

- `server/baby-photo-backend/.env` — Active config (JWT_SECRET, DATABASE_URL, WX_*, SENTRY_DSN, CORS_ORIGIN, etc.)
- `server/baby-photo-backend/.env.example` — Template for new setups
- `server/baby-photo-backend/.env.production.example` — Production template with secure defaults

### Admin Frontend (`client/admin-frontend/`)

React SPA with Vite:

- **`src/pages/`** — ~30 route page directories grouped by domain
- **`src/components/`** — Shared UI components (Layout, ProtectedRoute, ImageUpload, RichTextEditor, Calculator)
- **`src/store/`** — Redux Toolkit store (authSlice, userSlice, orderSlice, packageSlice, networkSlice, globalSlice)
- **`src/services/`** — API client layer:
  - `api.ts` — Axios instance with interceptors (JWT token injection, 401→redirect, 5xx auto-retry for GET). Exports `request` (returns AxiosResponse) and `simple` (unwraps to data directly)
  - ~30 domain service files, each organized as an object with async methods (e.g., `orderService.getOrders()`)
- **`src/types/`** — TypeScript types including `ApiResponse<T>`, `PaginatedResponse<T>`, `PaginationParams`
- **Path alias**: `@/` maps to `./src`
- **Routing**: `App.tsx` defines lazy-loaded routes with `ProtectedRoute` wrapper, Chinese locale
- **Dev proxy**: Vite proxies `/api` to backend (configurable via `VITE_BACKEND_URL`)
- **Base path**: `/admin/` (served behind nginx at `/admin/`)

#### Service Layer Convention

Services use either `request` (returns `AxiosResponse<ApiResponse<T>>`) or `simple` (returns `T` directly).
```ts
// Typical pattern: object with async methods
export const orderService = {
  async getOrders(params: GetOrdersParams): Promise<{ data: PaginatedResponse<Order> }> {
    const res = await simple.get<any>('/orders', { params });
    return res;
  },
  async createOrder(data: OrderFormData): Promise<{ data: Order }> {
    return simple.post<any>('/orders', data);
  },
  async updateOrder(id: string, data: Partial<OrderFormData>): Promise<{ data: Order }> {
    return request.patch(`/orders/${id}`, data).then(r => r.data);
  },
};
```

### Store Frontend (`client/ps-frontend/`)

Separate React SPA for customer-facing store. Simpler structure, ~10 pages. API layer is straightforward: `axios.create({ baseURL: '/api/v1' })` with response interceptor that directly returns `response.data`.

### WeChat Mini Program (`client/psyd/`)

Separate mini-program project under `client/psyd/miniprogram/`:

- **UI Framework**: Vant Weapp (`@vant/weapp`)
- **Pages**: 37+ pages, Tab Bar: 4 tabs (预约/商品/购物车/我的)
- **API calls**: Custom `utils/request.ts` wrapper around `wx.request` with JWT token, auto-refresh token on 401, fallback URL switching on network failure
- **PATCH workaround**: WeChat mini-program doesn't support HTTP PATCH. Use `utils/request.ts` `patch()` which sends POST with `X-HTTP-Method-Override: PATCH` header. Backend `main.ts` has middleware to handle this.
- **Auth**: `utils/auth.ts` — wxLogin flow (wx.login → backend code exchange → JWT), phone number login, token management
- **Key entry files**: `app.json` (page registration + tab bar), `app.ts` (global lifecycle), `app.wxss` (global styles)
- **Config**: `config/index.ts` defines BASE_URL, FALLBACK_URL, TOKEN_KEY

## Development Commands

### Backend
```bash
cd server/baby-photo-backend
npm run start:dev        # Watch mode (port 3000)
npm run start:debug      # Debug + watch mode
npm run build            # Compile
npm run test             # Jest unit tests (*.spec.ts in src/)
npm run test:watch       # Jest watch mode
npm run test:cov         # Jest with coverage
npm run test:e2e         # Jest e2e tests (config in test/jest-e2e.json)
npm run test -- -t "test name pattern"  # Run single test by name pattern
npm run lint             # ESLint --fix
npm run typecheck        # tsc --noEmit
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run dev migrations
npm run prisma:studio    # Open Prisma Studio (port 5555, also via Docker: profile db-admin)
npm run seed:e2e         # Seed data for e2e tests
```

**Jest config** (in package.json): rootDir=src, testRegex=.*\\.spec\\.ts$, ts-jest transform, node environment.

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

### Store Frontend
```bash
cd client/ps-frontend
npm run dev              # Vite dev server on port 3003
npm run build            # TypeScript check + Vite build
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
- `playwright.config.ts` — Root-level Playwright config targeting `tests/e2e/` (Chromium only, retries: 2)
- `server/baby-photo-backend/.env` — Backend env vars
- `client/admin-frontend/vite.config.ts` — Vite proxy, path aliases (`@/`), build chunks with manualChunks for react/antd/axios

## Root-Level Tooling

- **Husky** + **lint-staged**: Pre-commit hooks run ESLint on staged backend `.ts` and admin-frontend `.ts/.tsx` files
- **Playwright**: E2E tests in `tests/e2e/`, `baseURL: http://localhost:3000`, Chromium-only, 2 retries
- **Sentry**: Both backend (`@sentry/node`) and admin frontend (`@sentry/react`) have Sentry integration via `SENTRY_DSN` env var

## Getting Started

1. `cp server/baby-photo-backend/.env.example server/baby-photo-backend/.env` — configure DB, Redis, JWT, WeChat credentials
2. `docker compose up -d` — starts PostgreSQL, Redis, and backend
3. Backend: `cd server/baby-photo-backend && npm install && npm run prisma:migrate && npm run start:dev`
4. Admin frontend: `cd client/admin-frontend && npm install && npm run dev`
5. Store frontend: `cd client/ps-frontend && npm install && npm run dev`
