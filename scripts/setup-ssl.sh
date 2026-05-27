#!/bin/bash
# ======================================================
# 乖宝宝儿童影楼管理系统 - SSL 证书自动配置脚本
# 使用 Let's Encrypt + Certbot 免费证书
# 仅需修改 DOMAIN 为实际域名后执行
# ======================================================

set -e

DOMAIN="${1:-guaibaobao.net}"
EMAIL="${2:-admin@${DOMAIN}}"
SSL_DIR="$(dirname "$0")/../ssl"

echo "=== 开始配置 SSL 证书 ==="
echo "域名: $DOMAIN"
echo "邮箱: $EMAIL"

# 检查是否已安装 certbot
if ! command -v certbot &> /dev/null; then
    echo "安装 certbot..."
    apt-get update && apt-get install -y certbot
fi

# 申请证书（standalone 模式，需临时占用 80 端口）
echo "申请证书..."
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN"

# 复制证书到项目 ssl 目录
mkdir -p "$SSL_DIR"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

if [ -f "$CERT_DIR/fullchain.pem" ]; then
    cp "$CERT_DIR/fullchain.pem" "$SSL_DIR/cert.pem"
    cp "$CERT_DIR/privkey.pem" "$SSL_DIR/key.pem"
    echo "✅ 证书已复制到 $SSL_DIR/"
else
    echo "❌ 证书未生成，请检查 certbot 输出"
    exit 1
fi

# 设置权限
chmod 644 "$SSL_DIR/cert.pem"
chmod 600 "$SSL_DIR/key.pem"

echo ""
echo "=== 证书配置完成 ==="
echo ""
echo "后续操作："
echo "1. 修改 nginx.conf 中 server_name 为 $DOMAIN"
echo "2. docker compose --profile production up -d"
echo "3. 验证: curl -I https://$DOMAIN"
echo ""
echo "自动续期（每月执行）："
echo "  0 3 1 * * certbot renew --quiet && cp $CERT_DIR/fullchain.pem $SSL_DIR/cert.pem && cp $CERT_DIR/privkey.pem $SSL_DIR/key.pem && docker exec gbb-nginx nginx -s reload"
