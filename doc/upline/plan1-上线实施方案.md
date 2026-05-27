# 上线实施方案 Plan 1 — 最小可行上线路径

> 目标：以最快速度、最低风险完成系统上线  
> 策略：优先解决真正阻塞上线的安全问题与运维短板，非核心功能上线后迭代  
> 原则：每一个任务项都必须可执行、可验证，适合 AI 协作完成

---

## 核心策略建议

**不要追求"全部完善再上线"。** 当前系统的核心业务流程（订单→支付→排片→完成）已经可用，最理智的上线路径是：

```
安全加固 → 核心流程验收 → 生产部署 → 灰度观察 → 全量开放
```

以下方案按 **P0（阻塞）→ P1（重要）→ P2（后续）** 严格排序，建议按编号顺序逐项执行。

---

## P0 — 上线阻塞项（不完成则不上线）

---

### P0-1：JWT Secret 生产环境强制校验

**为什么必须做：** 当前 `JWT_SECRET` 的默认值为 `change-me-in-production`，如漏改则任何人都可伪造 JWT Token 接管系统。

**文件：** `D:\vscode\GBBV2\server\baby-photo-backend\src\main.ts`

**改动：**
```typescript
// 在 bootstrap() 开头加入
if (process.env.JWT_SECRET === 'change-me-in-production' || !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET must be changed from default value in production');
}
```

**验证方法：** 设置 `JWT_SECRET=change-me-in-production` 启动 → 应用应拒绝启动。

---

### P0-2：环境变量启动校验

**为什么必须做：** 防止因环境变量漏配导致运行时异常（如数据库连不上、微信支付报错等诡异问题）。

**新建文件：** `D:\vscode\GBBV2\server\baby-photo-backend\src\shared\config\env-validator.ts`

**改动：** 在 `main.ts` 中启动前校验所有必需变量：
```
生产必需的：DATABASE_URL, JWT_SECRET, ENCRYPT_KEY, CORS_ORIGIN
支付相关（如启用微信支付）：WX_APP_ID, WX_APP_SECRET, WECHAT_MCH_ID, WECHAT_API_KEY
```

**验证方法：** 删掉某个必需变量后启动 → 应打印明确错误信息并退出。

---

### P0-3：HTTPS + 安全头配置

**为什么必须做：** 生产环境必须全站 HTTPS，否则密码、Token、支付信息明文传输。CSP 头可以同时做好 XSS 防护。

**文件：** `D:\vscode\GBBV2\nginx.conf`

**改动内容：**
1. 取消 443 server block 的注释，配置 SSL 证书路径
2. 增加 80 → 443 强制跳转
3. 启用以下安全头：
   - `Content-Security-Policy: default-src 'self'`（按实际需要放宽）
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`

**验证方法：** `curl -I https://your-domain.com` 确认响应头中包含上述头。

**注意：** SSL 证书需提前准备（Let's Encrypt 免费），可以上线第一天再做，但必须在上线前完成 HTTPS。

---

### P0-4：文件上传安全加固

**为什么必须做：** 当前上传接口无文件类型白名单校验，攻击者可上传恶意脚本（.php/.jsp/.html）到服务器。

**文件：** `D:\vscode\GBBV2\server\baby-photo-backend\src\modules\files\files.controller.ts`

**改动：**
1. 增加文件类型白名单：`['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']`
2. 文件大小上限使用 `MAX_FILE_SIZE` 环境变量（默认 10MB）
3. 上传文件名使用 UUID 重命名，避免路径遍历攻击

**验证方法：** 尝试上传 `.html` 或 `.exe` 文件 → 应被拒绝并返回错误。

---

### P0-5：生产部署验证

**为什么必须做：** 需确保 Docker Compose 生产配置能在真实环境正常启动。

**文件：** `D:\vscode\GBBV2\docker-compose.yml`

**改动与验证：**
1. 确保所有 service 的 `restart: always` 已配置
2. 后端服务的 `NODE_ENV=production` 已设置
3. PostgreSQL 数据卷持久化映射已配置
4. 确认 `.env` 文件在生产服务器上正确配置

**验证方法：**
```bash
# 在测试服务器上执行完整部署
git pull
docker compose -f docker-compose.yml up -d --build
docker compose ps    # 所有服务应为 Up 状态
curl http://localhost:3000/api/v1/health    # 返回 200
```

---

### P0-6：应用错误监控接入（Sentry）

**为什么必须做：** 上线后无错误监控等于盲飞。用户反馈 Bug 时无法定位原因。

**操作步骤：**
1. 注册 Sentry 账号（sentry.io，免费额度足够）
2. 前端接入：`D:\vscode\GBBV2\client\admin-frontend\src\main.tsx`
   ```typescript
   import * as Sentry from '@sentry/react';
   Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN });
   ```
3. 后端接入：`D:\vscode\GBBV2\server\baby-photo-backend\src\main.ts`
   ```typescript
   import * as Sentry from '@sentry/node';
   Sentry.init({ dsn: process.env.SENTRY_DSN });
   ```
4. 前端构建时上传 source map（配置 `vite.config.ts` sentry plugin）

**验证方法：** 手动触发一个错误 → Sentry 控制台应在 1 分钟内看到错误事件。

---

### P0-7：数据库自动备份

**为什么必须做：** 数据是系统的生命线。无备份 = 无保障。

**方案选择（推荐方案A）：**
- **A（简单可靠）**：宿主机 cron job 调用 `pg_dump` + 上传到阿里云 OSS / 腾讯云 COS
- **B（已有基础设施）**：利用现有的 `SystemBackup` 模块的定时任务，但需验证其完整性和可恢复性

**操作步骤（方案A）：**
```bash
# 在宿主机配置每日备份 cron
0 3 * * * pg_dump -U postgres baby_photo_db | gzip > /backups/daily/baby_photo_$(date +\%Y\%m\%d).sql.gz
# 保留30天，自动清理
0 4 * * * find /backups/daily -name "*.sql.gz" -mtime +30 -delete
```

**验证方法：** 手动执行备份脚本 → 确认 .sql.gz 文件生成 → 使用 `gunzip -c 文件.sql.gz | psql -U postgres test_db` 验证可恢复。

---

### P0-8：核心业务流程 UAT

**为什么必须做：** 确保核心流程在真实数据环境下可用。

**测试用例清单（逐条执行并签字）：**

| # | 测试场景 | 预期结果 | 状态 |
|---|----------|----------|------|
| 1 | 管理员登录 | 成功进入仪表盘 | □ |
| 2 | 创建客户订单（选择套系、时间槽） | 订单创建成功，状态 PENDING | □ |
| 3 | 录入收款（线下支付） | 支付记录生成，订单状态更新 | □ |
| 4 | 订单状态推进（确认→拍摄→完成） | 状态正常流转 | □ |
| 5 | 创建商品入库 | 库存增加，流水记录正确 | □ |
| 6 | 创建商品出库（关联订单） | 库存扣减，流水记录正确 | □ |
| 7 | 创建采购订单→审批→发货→收货 | 采购单状态正常流转 | □ |
| 8 | 创建优惠券→客户领取→使用 | 优惠券生命周期完整 | □ |
| 9 | 角色权限配置 | 不同角色看到不同菜单 | □ |
| 10 | 数据导出（订单/用户/财务） | Excel 文件正常下载 | □ |

**执行方式：** 真实业务人员按上述清单操作，每个用例通过后签字确认。

---

## P1 — 重要项（建议上线前或上线第一周完成）

---

### P1-1：操作日志完整性审计

**为什么重要：** 核心操作（退款、删除、改价）必须有日志可追溯。

**文件：** `D:\vscode\GBBV2\server\baby-photo-backend\src\shared\interceptors\operation-log.interceptor.ts`

**检查清单：**
- [ ] 支付确认操作是否记录了操作人、金额、支付方式
- [ ] 退款操作是否记录了退款原因、操作人、金额
- [ ] 订单删除/取消是否记录了操作人
- [ ] 商品价格修改是否记录了修改前后值

**修改方法：** 在对应的 Controller/Service 方法中手动调用 `operationLogService.log()`，或在关键方法上使用自定义装饰器。

---

### P1-2：Docker 日志轮转配置

**为什么重要：** 无日志轮转会导致 Docker 日志文件无限增长占满磁盘。

**文件：** `D:\vscode\GBBV2\docker-compose.yml`

**改动：** 在每个 service 下增加：
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

**验证方法：** 部署后检查 `/var/lib/docker/containers/*/` 日志文件大小。

---

### P1-3：一键部署脚本

**为什么重要：** 减少人工操作失误，让部署流程可重复可追溯。

**新建文件：** `D:\vscode\GBBV2\deploy.sh`

**功能要求：**
1. `git pull` 拉取最新代码
2. `docker compose -f docker-compose.yml build` 构建镜像
3. `docker compose -f docker-compose.yml up -d` 启动服务
4. 等待健康检查通过
5. 检查上次镜像版本，失败时自动回滚

---

### P1-4：前端路由懒加载全覆盖检查

**为什么重要：** 首页加载 JS 包过大（Vite 构建显示 3MB+），懒加载可大幅减少首屏时间。

**检查文件：** `D:\vscode\GBBV2\client\admin-frontend\src\App.tsx`

**操作：**
- 确认所有页面使用 `React.lazy(() => import(...))`
- 非首屏页面禁止直接 import
- 为懒加载页面统一包裹 `Suspense` + fallback loading

---

### P1-5：Axios 全局超时与重试

**为什么重要：** 网络波动时请求挂起会导致用户无反馈，需优雅处理。

**文件：** `D:\vscode\GBBV2\client\admin-frontend\src\services\api.ts`

**改动：**
- 超时时间：15 秒
- 自动重试：失败时重试 1 次
- 超时/断网时给出中文提示

---

### P1-6：生产环境 Nginx 配置优化

**为什么重要：** 默认 Nginx 配置性能很差，需要调优。

**文件：** `D:\vscode\GBBV2\nginx.conf`

**改动：**
- 开启 Gzip 压缩（减少前端资源传输体积 60-70%）
- 静态资源强缓存（CSS/JS 设置 `max-age=31536000`）
- `worker_processes auto; worker_connections 1024;`

---

## P2 — 后续项（上线后完成）

| # | 项 | 建议迭代时间 |
|---|----|-------------|
| P2-1 | WeChat 支付签名验证接入 | 上线后第 1 周 |
| P2-2 | 敏感操作二次确认（退款/删除） | 上线后第 1 周 |
| P2-3 | 后端单元/集成测试（核心 20 个接口） | 上线后第 2 周 |
| P2-4 | GitHub Actions 自动部署 job | 上线后第 2 周 |
| P2-5 | 健康检查页面增强（含 DB/Redis/磁盘） | 上线后第 2 周 |
| P2-6 | 版本号注入（Git SHA + 构建时间） | 上线后第 2 周 |
| P2-7 | 微信模板消息正式接入 | 上线后第 3 周 |
| P2-8 | 移动端后台响应式适配 | 上线后第 3 周 |
| P2-9 | Phase 4 剩余功能（销量预测/库存分析等） | 上线后持续 |
| P2-10 | 批量操作（订单/商品） | 上线后持续 |

---

## 建议的执行顺序与分工

```
Day 1-2: P0-1 JWT校验 + P0-2 环境变量校验 + P0-4 文件上传加固
         └── 这三项适合 AI 批量完成，改动量小，验证简单

Day 2-3: P0-5 生产部署验证
         └── 需要运维配合，建议与 Day1-2 并行进行

Day 3-4: P0-6 Sentry 接入 + P1-1 日志审计
         └── 可并行执行

Day 4-5: P0-7 数据库备份配置 + P1-2 Docker日志轮转 + P1-5 Axios超时
         └── 三项可并行

Day 5-7: P0-3 HTTPS + 安全头（依赖SSL证书）
         └── 证书可能需要等待，建议第一天就提交申请

Day 8-9: P0-8 UAT 测试
         └── 需要业务人员参与，提前预约时间

Day 10:  修复 UAT 发现的 Bug
         └── 预留 buffer

Day 11:  灰度上线（仅内部员工使用）
Day 12-14: 观察 + 修复 + P1-3 部署脚本 + P1-4 懒加载
Day 15+:  全量开放
```

**核心建议：**

1. **今天就可以开始的**：P0-1, P0-2, P0-4（这三项 AI 可以立刻帮你做完）
2. **需要人工配合的**：SSL 证书申请、域名备案、UAT 测试
3. **不用等上线再做的**：P1-4 懒加载、P1-7 Nginx 优化随时可以提交
4. **建议砍掉不上线**：A/B 测试、多门店、开放平台这些与 MVP 无关的功能，标记到 Phase 5

---

## 各任务项 AI 可执行性评估

| 编号 | 任务 | AI 可执行度 | 说明 |
|------|------|------------|------|
| P0-1 | JWT 生产校验 | ⭐⭐⭐⭐⭐ | 3 行代码，改动明确 |
| P0-2 | 环境变量校验 | ⭐⭐⭐⭐⭐ | 写一个校验函数即可 |
| P0-4 | 文件上传加固 | ⭐⭐⭐⭐⭐ | 白名单 + 大小限制 |
| P0-6 | Sentry 接入 | ⭐⭐⭐⭐ | 安装包 + 初始化代码，需提供 DSN |
| P1-1 | 日志审计 | ⭐⭐⭐ | 需逐模块检查，可能需要补代码 |
| P1-2 | Docker 日志轮转 | ⭐⭐⭐⭐⭐ | YAML 配置改动 |
| P1-3 | 部署脚本 | ⭐⭐⭐⭐ | Shell 脚本编写 |
| P1-4 | 懒加载检查 | ⭐⭐⭐⭐ | 代码审查 + 改动 |
| P1-5 | Axios 超时 | ⭐⭐⭐⭐⭐ | 配置项修改 |
| P1-7 | Nginx 优化 | ⭐⭐⭐⭐⭐ | 配置修改 |
| P0-3 | HTTPS | ⭐⭐ | 需要服务器操作权限 |
| P0-5 | 部署验证 | ⭐⭐ | 需要服务器访问权限 |
| P0-7 | 数据库备份 | ⭐⭐ | 需要服务器操作权限 |
| P0-8 | UAT | ⭐ | 需要真人操作验证 |

---

## 如何与 AI 配合执行

每个任务的标准执行流程：

1. **你告诉 AI：** "执行 P0-1" 或 "开始做 JWT 生产环境校验"
2. **AI 会：** 修改代码 → 运行 TypeScript 编译检查 → 验证逻辑正确性
3. **你需要做的：** 确认改动 → 提交到 Git → 通知 AI 进行下一项

建议**一次只执行一个 P0 任务**，完成确认后再开始下一个，避免并行带来的混乱。

---

*文档结束 — 按 P0 → P1 → P2 顺序执行即可安全上线*
先规划测试流程：                                                                                                                                
  1. 登录 → 进入管理后台                                                                                                                         2. 创建订单 → 选套餐、填客户信息、提交                       
  3. 支付定金 → 到支付管理，对虚拟记录点"收款"                                                                                                   4. 收取尾款 → 再创建一笔尾款支付                             
  5. 验证 → 订单状态变更为已支付，数据看板营收更新

  开始吧。先登录系统。