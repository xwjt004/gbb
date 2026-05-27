#!/bin/bash
set -euo pipefail

echo "=== 安装 Docker (Tencent Mirror) ==="

# 安装前置依赖
sudo apt-get update -qq
sudo apt-get install -y -qq ca-certificates curl

# 使用腾讯云镜像
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://mirrors.tencent.com/docker-ce/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://mirrors.tencent.com/docker-ce/linux/ubuntu $CODENAME stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt-get update -qq
sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 配置 Docker 镜像加速（腾讯云）
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com"],
  "log-driver": "json-file",
  "log-opts": {"max-size": "10m", "max-file": "3"}
}
EOF

# 启动 Docker
sudo systemctl enable docker
sudo systemctl start docker

# 添加当前用户到 docker 组
sudo usermod -aG docker ubuntu

echo "=== 完成 ==="
docker --version
docker compose version
