#!/bin/bash
# ============================================
# 乖宝宝管理系统 — 数据库备份脚本
# 用法:
#   bash scripts/backup-db.sh                   # 创建备份
#   bash scripts/backup-db.sh upload            # 创建备份并上传到远程存储
#   bash scripts/backup-db.sh clean             # 仅清理过期备份
#
# 推荐 cron 配置（每天凌晨3点备份，4点清理）:
#   0 3 * * * /path/to/scripts/backup-db.sh
#   0 4 * * * /path/to/scripts/backup-db.sh clean
# ============================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/daily}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-}"
DB_CONTAINER="gbb-postgres"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-baby_photo_db}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="baby_photo_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

# 远程存储配置（可选，用于上传到 OSS/COS/S3）
REMOTE_ENABLED="${REMOTE_ENABLED:-false}"
REMOTE_TYPE="${REMOTE_TYPE:-oss}"   # oss | cos | s3
REMOTE_BUCKET="${REMOTE_BUCKET:-}"
REMOTE_PATH="${REMOTE_PATH:-backups}"

mkdir -p "${BACKUP_DIR}"

case "${1:-backup}" in
  backup)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始数据库备份..."

    # 确定 docker exec 命令（支持 docker-compose 和独立 docker）
    if [ -n "${COMPOSE_PROJECT}" ]; then
      DOCKER_CMD="docker-compose -p ${COMPOSE_PROJECT} exec -T"
    else
      DOCKER_CMD="docker exec"
    fi

    # 执行备份
    ${DOCKER_CMD} "${DB_CONTAINER}" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${FILEPATH}"

    # 验证
    if [ -f "${FILEPATH}" ] && [ -s "${FILEPATH}" ]; then
      FILESIZE=$(du -h "${FILEPATH}" | cut -f1)
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份完成: ${FILEPATH} (${FILESIZE})"
    else
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] 错误: 备份文件为空或不存在"
      exit 1
    fi

    # 上传到远程存储
    if [ "${REMOTE_ENABLED}" = "true" ] && [ -n "${REMOTE_BUCKET}" ]; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] 上传到远程存储..."
      case "${REMOTE_TYPE}" in
        oss)
          ossutil cp "${FILEPATH}" "oss://${REMOTE_BUCKET}/${REMOTE_PATH}/${FILENAME}" ;;
        cos)
          coscli cp "${FILEPATH}" "cos://${REMOTE_BUCKET}/${REMOTE_PATH}/${FILENAME}" ;;
        s3)
          aws s3 cp "${FILEPATH}" "s3://${REMOTE_BUCKET}/${REMOTE_PATH}/${FILENAME}" ;;
      esac
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] 上传完成"
    fi
    ;;

  clean)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 清理 ${RETENTION_DAYS} 天前的备份..."
    find "${BACKUP_DIR}" -name "baby_photo_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 清理完成"
    ;;

  *)
    echo "用法: $0 {backup|clean|upload}"
    echo "  backup  创建备份（默认）"
    echo "  clean   清理过期备份"
    exit 1
    ;;
esac
