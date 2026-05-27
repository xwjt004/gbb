# 上线实施方案执行结果

> 基于 `plan1-上线实施方案.md` 的 P0-P2 逐项对照，标记完成状态并汇总仍需人工操作的项目。

---

## 执行总览

| 优先级 | 总数 | 代码完成 | 需人工操作 |
|--------|------|---------|-----------|
| P0（上线阻塞） | 8 | 5 | 3 |
| P1（重要） | 6 | 2 | 4 |
| P2（后续） | 10 | 2 | 8 |

---

## P0 — 上线阻塞项

| 编号 | 项目 | 代码状态 | 需人工 |
|------|------|---------|-------|
| P0-1 | JWT Secret 生产环境强制校验 | ✅ `main.ts:27-36` | 否 |
| P0-2 | 环境变量启动校验 | ✅ `env-validator.ts` | 否 |
| P0-3 | HTTPS + 安全头配置 | ✅ nginx 已配置 | **是** |
| P0-4 | 文件上传安全加固 | ✅ 白名单/UUID/大小限制 | 否 |
| P0-5 | 生产部署验证 | ✅ Docker 配置已修复 | **是** |
| P0-6 | Sentry 错误监控 | ✅ 前后端代码已集成 | **是** |
| P0-7 | 数据库自动备份 | ✅ SystemBackup 模块就绪 | **是** |
| P0-8 | 核心业务流程 UAT | ✅ E2E 技术验收通过 | **是** |

---

## 需人工操作项目清单

---

### 1. SSL 证书申请与配置

| 项目 | 内容 |
|------|------|
| **项目名称** | SSL 证书申请与 HTTPS 配置 |
| **项目内容** | 为域名申请 Let's Encrypt 免费证书，启用全站 HTTPS |
| **功能作用** | 加密所有数据传输，防止密码/Token/支付信息明文泄露；满足微信小程序强制 HTTPS 要求；提升搜索排名 |
| **操作方法** | |

```bash
# 1. 修改 nginx.conf 中的 server_name 为实际域名
#    文件: d:\vscode\GBBV2\nginx.conf
#    将 your-domain.com 替换为实际域名（共 2 处）

# 2. 运行一键证书申请脚本
sudo bash scripts/setup-ssl.sh your-domain.com admin@your-domain.com

# 3. 构建并启动生产环境
docker compose --profile production up -d --build

# 4. 验证
curl -I https://your-domain.com                    # → 200
curl -I http://your-domain.com                     # → 301 跳转
curl -I https://your-domain.com/api/v1/health      # → 200
```

```bash
# 备用：手动申请（如脚本不可用）
sudo certbot certonly --standalone --agree-tos -d your-domain.com -m admin@your-domain.com
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem
```

**验证标准：**
- 浏览器访问 https://your-domain.com 显示安全锁
- `curl -I https://your-domain.com` 响应头包含：
  - `Strict-Transport-Security`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`

---

### 2. Sentry 错误监控接入

| 项目 | 内容 |
|------|------|
| **项目名称** | Sentry 错误监控接入 |
| **项目内容** | 注册 Sentry 账号，获取 DSN 并配置到前后端环境变量 |
| **功能作用** | 上线后实时捕获后端 500 错误和前端 JS 异常，快速定位线上 Bug，避免盲飞 |
| **操作方法** | |

```text
第 1 步：注册 Sentry 账号
  访问 https://sentry.io
  点击 "Get Started" 注册（免费额度 5 万 events/月）
  创建组织（Organization）→ 创建项目（Project）

第 2 步：创建两个项目
  项目 A：baby-photo-backend（平台选 Node.js）
  项目 B：baby-photo-frontend（平台选 React）

第 3 步：配置后端 DSN
  编辑 server/baby-photo-backend/.env，添加：
  SENTRY_DSN=https://xxx@sentry.io/xxx
  SENTRY_TRACES_SAMPLE_RATE=0.1

第 4 步：配置前端 DSN
  编辑 client/admin-frontend/.env，添加：
  VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
  VITE_SENTRY_ENVIRONMENT=production

第 5 步：重启服务
  docker compose up -d --build backend
```

**验证标准：**
- 手动触发一个 500 错误（如访问不存在的 API）
- 登录 Sentry 控制台，1 分钟内应看到错误事件
- 错误应包含完整调用堆栈和请求上下文

---

### 3. 数据库备份配置

| 项目 | 内容 |
|------|------|
| **项目名称** | 数据库自动备份 |
| **项目内容** | 在生产服务器配置每日自动备份 + 定期清理旧备份 |
| **功能作用** | 数据是系统的生命线。硬件故障、误操作、数据损坏时可快速恢复，避免数据丢失 |
| **操作方法** | |

```bash
# 第 1 步：创建备份目录
mkdir -p /backups/daily

# 第 2 步：配置 crontab（每日备份）
crontab -e

# 添加以下内容：
# 每日凌晨 3 点备份
0 3 * * * docker exec gbb-postgres pg_dump -U postgres baby_photo_db | gzip > /backups/daily/baby_photo_$(date +\%Y\%m\%d).sql.gz

# 保留 30 天，自动清理过期备份
0 4 * * * find /backups/daily -name "*.sql.gz" -mtime +30 -delete
```

**验证标准：**
- 备份目录有 `.sql.gz` 文件生成
- 文件可解压且内容完整
- 30 天前的备份被自动清理

---

### 4. 生产环境部署

| 项目 | 内容 |
|------|------|
| **项目名称** | 生产环境部署 |
| **项目内容** | 在生产服务器执行 `docker compose up`，验证所有服务正常启动 |
| **功能作用** | 确保 Docker 构建和部署流程在真实环境可执行，验证自动迁移脚本正常工作 |
| **操作方法** | |

```bash
# 前置条件：服务器已安装 Docker，SSL 证书已配置，环境变量已配置

# 第 1 步：克隆代码
git clone <仓库地址> /opt/baby-photo
cd /opt/baby-photo

# 第 2 步：配置环境变量
cp server/baby-photo-backend/.env.production.example server/baby-photo-backend/.env
# 编辑 .env，填入实际值（数据库密码、JWT_SECRET 等）

# 第 3 步：构建并启动
docker compose --profile production up -d --build

# 第 4 步：验证
docker compose ps                     # 全部服务 Up (healthy)
curl http://localhost:3000/api/v1/health  # 200
docker compose logs backend --tail 30    # 含 migrations 执行日志
```

**验证标准：**
- `docker compose ps` 全部服务 `Up`
- `/api/v1/health` 返回 200
- 数据库迁移自动执行，无报错

---

### 5. 核心业务流程 UAT

| 项目 | 内容 |
|------|------|
| **项目名称** | 核心业务流程用户验收测试 |
| **项目内容** | 真实业务人员按测试用例逐条操作并签字确认 |
| **功能作用** | 确保系统在真实业务场景下可用，发现技术验收遗漏的用户体验问题 |
| **操作方法** | |

| # | 测试场景 | 预期结果 | 签字 |
|---|----------|---------|------|
| 1 | 管理员登录 | 成功进入仪表盘 | □ |
| 2 | 创建客户订单（选择套系、时间槽） | 订单创建成功，状态 PENDING | □ |
| 3 | 录入收款（线下支付） | 支付记录生成，订单状态更新 | □ |
| 4 | 订单状态推进（确认→拍摄→完成） | 状态正常流转 | □ |
| 5 | 创建商品入库 | 库存增加，流水记录正确 | □ |
| 6 | 商品出库（关联订单） | 库存扣减，流水记录正确 | □ |
| 7 | 优惠券全流程（创建→领取→使用） | 优惠券生命周期完整 | □ |
| 8 | 角色权限配置 | 不同角色看到不同菜单 | □ |
| 9 | 数据导出（订单/用户/财务） | Excel 文件正常下载 | □ |
| 10 | 退款流程（申请→审批→执行） | 退款成功，订单状态正确 | □ |

---

### 6. 生产环境变量配置

| 项目 | 内容 |
|------|------|
| **项目名称** | 生产环境变量设置 |
| **项目内容** | 将所有占位符环境变量替换为实际值 |
| **功能作用** | 防止因默认值导致的安全漏洞或运行时异常 |
| **操作方法** | |

编辑 `server/baby-photo-backend/.env`，逐项确认：

```bash
# 🔴 必需修改（不修改则无法启动或存在安全风险）
JWT_SECRET=<生成 64 位随机字符串>    # openssl rand -hex 32
ENCRYPT_KEY=<生成 32 位随机字符串>   # openssl rand -hex 16
CORS_ORIGIN=https://admin.your-domain.com

# 🟡 微信相关（根据业务需要）
WX_APP_ID=wx实际AppId
WX_APP_SECRET=实际AppSecret
WECHAT_MCH_ID=微信支付商户号
WECHAT_API_KEY=微信支付API密钥

# 🟢 可选（不影响启动）
SENTRY_DSN=https://xxx@sentry.io/xxx
MAIL_HOST=smtp.example.com
```

---

### 7. SSL 证书自动续期

| 项目 | 内容 |
|------|------|
| **项目名称** | SSL 证书自动续期配置 |
| **项目内容** | 配置每月自动续期，确保证书永不过期 |
| **功能作用** | SSL 证书有效期 90 天，自动续期避免证书过期导致网站无法访问 |
| **操作方法** | |

```bash
crontab -e
# 每月 1 日凌晨 3 点执行续期 + 重载 nginx
0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/baby-photo/ssl/cert.pem && cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/baby-photo/ssl/key.pem && cd /opt/baby-photo && docker compose exec -T nginx nginx -s reload

# 验证续期是否正常工作
sudo certbot renew --dry-run
```

---

## P1 — 重要项（建议上线第一周完成）

| 编号 | 项目 | 代码状态 | 需人工 |
|------|------|---------|-------|
| P1-1 | 操作日志完整性审计 | ⬜ 需审查 | 是 |
| P1-2 | Docker 日志轮转 | ✅ 已在 compose 配置 | 否 |
| P1-3 | 一键部署脚本 | ⬜ 未创建 | 是 |
| P1-4 | 前端路由懒加载 | ⬜ 需检查 | 是 |
| P1-5 | Axios 全局超时与重试 | ⬜ 需配置 | 是 |
| P1-6 | Nginx 性能优化 | ✅ 已在配置中 | 否 |

---

## P2 — 后续项（上线后完成）

| 编号 | 项目 | 建议时间 |
|------|------|---------|
| P2-1 | 微信支付签名验证接入 | 第 1 周 |
| P2-2 | 敏感操作二次确认（退款/删除） | 第 1 周 |
| P2-3 | 后端单元/集成测试 | 第 2 周 |
| P2-4 | GitHub Actions 自动部署 | 第 2 周 |
| P2-5 | 健康检查页面增强（含 DB/Redis/磁盘） | 第 2 周 |
| P2-6 | 版本号注入（Git SHA + 构建时间） | 第 2 周 |
| P2-7 | 微信模板消息正式接入 | 第 3 周 |
| P2-8 | 移动端后台响应式适配 | 第 3 周 |
| P2-9 | 库存分析/销量预测完善 | 持续 |
| P2-10 | 批量操作（订单/商品） | 持续 |

---

## 建议执行顺序

```
先做（30 分钟）：
  ① 注册 Sentry → 获取 DSN → 配置环境变量
  ② 生成 JWT_SECRET / ENCRYPT_KEY → 配置 .env

需等待（1-2 天）：
  ③ 申请 SSL 证书（Let's Encrypt，通常几分钟完成）
  ④ 修改 nginx server_name → docker compose up

需人工协调：
  ⑤ 预约业务人员做 UAT（10 个用例，约 1 小时）
  ⑥ 生产服务器部署（如已备案，30 分钟）

上线当天：
  ⑦ 配置数据库备份 cron
  ⑧ 配置 SSL 续期 cron
```

---

> 文档自动生成于 2026-05-09，基于 Phase 1-4 验收结果
