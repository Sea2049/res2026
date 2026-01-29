#!/bin/bash

# =============================================
# sea2049.com 一键部署脚本
# 服务器 IP: 8.210.137.122
# =============================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

echo "========================================"
echo "  sea2049.com 部署脚本"
echo "========================================"
echo ""

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then 
    print_error "请使用 root 权限运行"
    exit 1
fi

# =============================================
# 1. 检查 Docker
# =============================================
print_info "步骤 1/7: 检查 Docker..."
if docker --version > /dev/null 2>&1; then
    print_success "Docker 已安装"
else
    print_error "Docker 未安装，请先安装 Docker"
    exit 1
fi

# =============================================
# 2. 检查应用容器
# =============================================
print_info "步骤 2/7: 检查应用容器..."
cd /opt/res2026

if docker-compose ps | grep -q "Up"; then
    print_success "应用容器正在运行"
else
    print_warning "应用容器未运行，正在启动..."
    docker-compose up -d --build
    sleep 5
fi

# =============================================
# 3. 配置环境变量
# =============================================
print_info "步骤 3/7: 配置环境变量..."
if [ ! -f ".env.production.local" ]; then
    cat > .env.production.local << 'EOF'
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://sea2049.com
TZ=Asia/Shanghai
NEXT_TELEMETRY_DISABLED=1
EOF
    print_success "环境变量已创建"
else
    print_success "环境变量已存在"
fi

# =============================================
# 4. 创建 SSL 目录
# =============================================
print_info "步骤 4/7: 创建 SSL 目录..."
mkdir -p /etc/nginx/ssl
print_success "SSL 目录已创建"

# =============================================
# 5. 检查 SSL 证书
# =============================================
print_info "步骤 5/7: 检查 SSL 证书..."
if [ -f "/etc/nginx/ssl/sea2049.com.pem" ] && [ -f "/etc/nginx/ssl/sea2049.com.key" ]; then
    print_success "SSL 证书已存在"
else
    print_warning "SSL 证书不存在，需要手动配置"
    echo ""
    echo "请按以下步骤生成 Cloudflare 源服务器证书："
    echo "1. 访问: https://dash.cloudflare.com/eaa2be3c0c46e38e5b439420eb81eb16/sea2049.com/ssl-tls/origin"
    echo "2. 点击 'Create Certificate'"
    echo "3. 选择 RSA (2048)，有效期 15 年"
    echo "4. 主机名: sea2049.com, *.sea2049.com"
    echo "5. 复制证书和密钥，分别保存为:"
    echo "   /etc/nginx/ssl/sea2049.com.pem"
    echo "   /etc/nginx/ssl/sea2049.com.key"
    echo ""
    read -p "证书配置完成后，按回车继续..."
fi

# =============================================
# 6. 创建 Nginx 配置
# =============================================
print_info "步骤 6/7: 创建 Nginx 配置..."
cat > /etc/nginx/sites-available/sea2049 << 'NGINXCONF'
upstream app_backend {
    server localhost:3000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name sea2049.com www.sea2049.com;

    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sea2049.com www.sea2049.com;

    ssl_certificate /etc/nginx/ssl/sea2049.com.pem;
    ssl_certificate_key /etc/nginx/ssl/sea2049.com.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    
    # Cloudflare IP
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    
    real_ip_header CF-Connecting-IP;
    real_ip_recursive on;
    
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    access_log /var/log/nginx/sea2049.access.log;
    error_log /var/log/nginx/sea2049.error.log;
    
    location /_next/static/ {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    location /api/ {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        proxy_read_timeout 90s;
    }
    
    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXCONF

print_success "Nginx 配置已创建"

# =============================================
# 7. 启用配置并重启
# =============================================
print_info "步骤 7/7: 启用配置并重启 Nginx..."

# 删除默认配置
rm -f /etc/nginx/sites-enabled/default

# 启用新配置
ln -sf /etc/nginx/sites-available/sea2049 /etc/nginx/sites-enabled/

# 测试配置
if nginx -t; then
    print_success "Nginx 配置测试通过"
    systemctl restart nginx
    systemctl enable nginx
    print_success "Nginx 已重启"
else
    print_error "Nginx 配置测试失败"
    exit 1
fi

# =============================================
# 完成
# =============================================
echo ""
echo "========================================"
print_success "部署完成！"
echo "========================================"
echo ""
print_info "下一步操作："
echo "1. 访问: https://sea2049.com"
echo ""
echo "2. 查看应用日志:"
echo "   docker-compose logs -f app"
echo ""
echo "3. 查看 Nginx 日志:"
echo "   tail -f /var/log/nginx/sea2049.access.log"
echo ""
print_success "祝你使用愉快！ 🎉"
