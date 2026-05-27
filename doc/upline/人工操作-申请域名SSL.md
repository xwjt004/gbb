 为域名申请 Let's Encrypt 免费证书，启用全站 HTTPS 的网址和方法                                                                                 ⎿  ⧉ Selected 1 lines from ..\..\doc\upline\plan1-上线实施方案执行结果.md in Visual Studio Code
                                                                                                                                               
● Let's Encrypt 免费 SSL 证书申请 + HTTPS 配置   
官网地址:
  Let's Encrypt:  
    https://letsencrypt.org
工作原理
  Let's Encrypt 使用 ACME 协议 自动验证你对域名的控制权，颁发有效期 90 天的免费证书。通过 certbot 工具自动完成申请、安装和续期。

  ---
  方法一：一键脚本（推荐）

  项目已提供自动脚本，只需执行：

  # 1. 进入项目目录
  cd /opt/baby-photo

  # 2. 运行脚本（替换为你的真实域名和邮箱）
  sudo bash scripts/setup-ssl.sh your-domain.com admin@your-domain.com

  脚本会：
  1. 自动安装 certbot
  2. 申请证书（standalone 模式，需临时占用 80 端口）
  3. 将证书复制到 ssl/ 目录
  4. 设置权限

  ---
  方法二：手动申请（更可控）

  # 1. 安装 certbot
  # Ubuntu/Debian:
  sudo apt-get update
  sudo apt-get install -y certbot

  # CentOS/RHEL:
  sudo yum install -y certbot

  # 2. 停止占用 80 端口的服务（如 Nginx）
  sudo systemctl stop nginx

  # 3. 申请证书（standalone 模式）
  sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email admin@your-domain.com \
    -d your-domain.com

  # 4. 复制证书到项目目录
  sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/baby-photo/ssl/cert.pem
  sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/baby-photo/ssl/key.pem
  sudo chmod 644 /opt/baby-photo/ssl/cert.pem
  sudo chmod 600 /opt/baby-photo/ssl/key.pem

  ---
  方法三：DNS 验证（无需停服，推荐泛域名）

  如果不想停 80 端口，用 DNS 方式验证：

  sudo certbot certonly --manual \
    --preferred-challenges dns \
    --email admin@your-domain.com \
    -d your-domain.com \
    -d "*.your-domain.com"

  执行后 certbot 会给出一个 TXT 记录值，去你的 DNS 管理后台（阿里云/腾讯云/Cloudflare）添加一条 _acme-challenge 的 TXT
  记录，等待生效后证书就签发了。

  ---
  脚本不适用时的备用方法

  # 用 Docker 运行 certbot（无需安装）
  docker run -it --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -p 80:80 \
    certbot/certbot certonly --standalone \
    --agree-tos \
    -d your-domain.com \
    -m admin@your-domain.com

  ---
  配置 nginx

  证书就绪后，修改 nginx.conf 两处 your-domain.com 为实际域名，然后：

  # 修改 nginx.conf 中的 server_name（共 2 处）
  # 文件: d:\vscode\GBBV2\nginx.conf
  # server_name your-domain.com;  →  server_name 你的实际域名;

  # 启动或重启
  docker compose --profile production up -d --build

  # 验证
  curl -I https://你的域名/api/v1/health

  ---
  验证 HTTPS 是否生效

  # 1. HTTPS 应返回 200
  curl -I https://your-domain.com
  # 期望: HTTP/2 200

  # 2. HTTP 应自动跳转 HTTPS
  curl -I http://your-domain.com
  # 期望: HTTP/1.1 301 Moved Permanently → Location: https://your-domain.com/

  # 3. 安全头检查
  curl -I https://your-domain.com | grep -i "strict-transport\|x-frame\|x-content"
  # 期望:
  #   strict-transport-security: max-age=31536000
  #   x-frame-options: SAMEORIGIN
  #   x-content-type-options: nosniff

  # 4. 在线检测（浏览器访问）
  # 打开 https://your-domain.com 检查地址栏绿色安全锁

  续期（自动）

  每月 1 日凌晨 3 点自动续期，配置一次即可：

  crontab -e
  # 添加：
  0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/baby-photo/ssl/cert.pem && cp
  /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/baby-photo/ssl/key.pem && docker compose -f /opt/baby-photo/docker-compose.yml exec -T   nginx nginx -s reload

  # 测试续期是否正常
  sudo certbot renew --dry-run

✻ Cogitated for 22s · 1 shell still running