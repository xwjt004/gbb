#!/bin/bash
# ============================================
# 乖宝宝儿童影楼管理系统 — 一键部署脚本
# 用法: bash deploy.sh [environment]
#   environment: production | staging (默认 production)
# ============================================

set -euo pipefail

ENV="${1:-production}"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
ENV_TEMPLATE="server/baby-photo-backend/.env.production.example"

echo "========================================"
echo "  乖宝宝管理系统部署脚本"
echo "  环境: ${ENV}"
echo "========================================"

# 检查 Docker 和 Compose
command -v docker >/dev/null 2>&1 || { echo "需要安装 Docker"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "需要安装 Docker Compose v2"; exit 1; }

# 检查 .env 文件
if [ ! -f "${ENV_FILE}" ]; then
  echo "未找到 ${ENV_FILE} 文件，从模板创建..."
  if [ -f "${ENV_TEMPLATE}" ]; then
    cp "${ENV_TEMPLATE}" "${ENV_FILE}"
    echo "已从 ${ENV_TEMPLATE} 创建 ${ENV_FILE}，请编辑并填入实际配置后再运行"
    exit 1
  else
    echo "缺少 ${ENV_FILE} 和模板文件 ${ENV_TEMPLATE}，无法部署"
    exit 1
  fi
fi

# 加载环境变量
set -a
source "${ENV_FILE}"
set +a

# 验证关键环境变量
: "${JWT_SECRET:?JWT_SECRET 未设置}"
: "${DATABASE_URL:?DATABASE_URL 未设置}"

# 拉取最新镜像
echo ""
echo "拉取最新 Docker 镜像..."
docker compose -f "${COMPOSE_FILE}" pull

# 启动数据库服务
echo ""
echo "启动数据库服务..."
docker compose -f "${COMPOSE_FILE}" up -d postgres redis
echo "等待数据库就绪..."
sleep 5

# 运行数据库迁移
echo ""
echo "运行数据库迁移..."
docker compose -f "${COMPOSE_FILE}" run --rm backend sh -c "npx prisma migrate deploy"

# 启动应用
echo ""
echo "启动应用服务..."
if [ "${ENV}" = "production" ]; then
  docker compose -f "${COMPOSE_FILE}" --profile production up -d
else
  docker compose -f "${COMPOSE_FILE}" up -d backend admin-frontend-dev
fi

# 健康检查
echo ""
echo "健康检查..."
sleep 3
HEALTH_URL="http://localhost:3000/api/v1/health"
for i in 1 2 3 4 5; do
  if curl -sf "${HEALTH_URL}" > /dev/null 2>&1; then
    echo "  后端服务正常"
    break
  fi
  echo "等待服务启动... (${i}/5)"
  sleep 3
done

echo ""
echo "========================================"
echo "  部署完成！"
echo "  后端 API:  http://localhost:3000"
echo "  API 文档:  http://localhost:3000/api/docs"
echo "  前端地址:  http://localhost:3002"
echo "========================================"
