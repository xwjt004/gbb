# Phase 1: 基础设施加固

## 目标

夯实项目底层质量，建立可维护的工程规范，为后续所有功能开发提供稳定基础。

---

## 1.1 错误处理与异常监控

**现状**: try/catch 散落在各个 service 中，无统一错误处理策略，前端 API 错误仅 console.error。

- [x] 后端统一异常过滤器（`ExceptionFilter`）规范化错误响应格式
- [x] 后端业务异常类体系（`BusinessException` 继承树：`NotFoundException`、`ConflictException`、`ValidateException`）
- [x] 前端 Axios 响应拦截器增强（统一错误提示、token 过期自动跳转登录）
- [x] 前端全局错误边界（`ErrorBoundary` 组件兜底展示）
- [ ] 前后端日志分级（debug/info/warn/error）及日志文件轮转

---

## 1.2 单元测试覆盖

**现状**: 项目几乎没有测试代码。

- [ ] 后端测试基础设施（Jest + 测试数据库/内存 Prisma）
- [ ] 核心 Service 单测：订单状态机、支付流程、退款计算、时间槽冲突检测
- [ ] 前端测试基础设施（Vitest + React Testing Library）
- [ ] 核心组件单测：支付列表、订单表格、统计卡片
- [ ] 新增代码要求：关键逻辑单元测试覆盖率 ≥ 70%

---

## 1.3 E2E 测试

**现状**: 无端到端测试，依赖人工验证。

- [ ] Playwright 测试框架配置 + 测试用户/数据准备脚本
- [ ] 核心流程 E2E：登录 → 订单创建 → 支付确认 → 退款
- [ ] 关键页面 E2E：时间槽批量创建、商品新增编辑、用户搜索
- [ ] CI 中集成 E2E 回归测试（定时执行）

---

## 1.4 TypeScript 严格模式

**现状**: tsconfig 有 `ignoreDeprecations` 配置错误，可能存在类型隐患。

- [x] 修复 tsconfig 配置，启用 `strict: true` + `noImplicitAny` + `strictNullChecks`
- [x] 消除所有 `any` 类型（优先泛型，其次 `unknown` + 类型守卫）*— 部分 done（后端付款适配器已用泛型，前端主要页面已消除 ~14 个 TS 错误）*
- [x] API 响应数据统一泛型 `ApiResponse<T>` 替代 `any`
- [x] 后端启用 NestJS `enableShutdownHooks` 等缺失配置

---

## 1.5 安全加固

**现状**: 基础 JWT 鉴权已存在，但缺少纵深防御。

- [x] 请求频率限制（`@nestjs/throttler` 防暴力/防刷）
- [ ] 敏感操作二次确认（退款/删除/取消订单需输入密码或验证码）
- [ ] XSS 防护（输出编码 + Content-Security-Policy 头）
- [x] SQL 注入防护确认（Prisma 参数化查询已天然防护，检查原始查询）
- [x] 敏感字段脱敏（日志中手机号/身份证号自动打码）
- [x] 文件上传类型/大小校验 + 扫描

---

## 1.6 开发体验（DX）

**现状**: 项目启动依赖外部文档，局部热更新可能不稳定。

- [ ] API 文档与调试（Swagger 完善接口描述、请求示例、响应模型）
- [ ] 环境变量校验（启动时校验所有必需环境变量，缺失则报错提示）
- [ ] 数据库 Migration 流程规范化（`prisma migrate` 替代 `db push`）
- [ ] 前端 Mock 数据方案（开发阶段不依赖后端即可调试）
- [ ] 代码生成器（plop 或 hygen：快速生成新 Module/Page 模板）

---

## 1.7 CI/CD 流水线

**现状**: 无持续集成/部署。

- [x] GitHub Actions：PR 自动运行 lint + typecheck + 单元测试
- [x] GitHub Actions：main 分支合并自动构建 Docker 镜像
- [x] Docker Compose 生产配置优化（多阶段构建、健康检查）
- [x] 部署文档 + 一键部署脚本

---

## 优先级建议

| 优先级 | 项目 | 工作量 | 说明 |
|--------|------|--------|------|
| P0 | TypeScript 严格模式 + 消除 any | 中 | 影响所有代码质量 |
| P0 | 统一错误处理 | 中 | 线上问题排查基础 |
| P1 | 单元测试（核心模块） | 大 | 防止回归，长期收益 |
| P1 | 安全加固 | 中 | 生产环境基本要求 |
| P2 | 开发体验 | 中 | 提升团队开发效率 |
| P2 | CI/CD | 中 | 自动化质量门禁 |
| P3 | E2E 测试 | 大 | 补充性质量保障 |
